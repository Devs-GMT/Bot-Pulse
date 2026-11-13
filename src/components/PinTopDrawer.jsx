import { useEffect, useRef, useState } from 'react'
import { useWallet } from '../lib/WalletContext.jsx'
import { shortAddr } from '../lib/wallet.js'
import { NAME_MAX, estimatePinCost, friendlyError, inspectTarget, pinContract } from '../lib/pinboard.js'
import { fmtBot } from '../lib/format.js'

const defaultName = (a) => `Contract ${a.slice(0, 6)}...${a.slice(-4)}`.slice(0, NAME_MAX)
const NOTE = 'Most active on BOT Chain this week'

/**
 * Pin the busiest contracts one after another. The list is frozen when the panel opens, every row has an editable
 * name, and each pin asks for its own confirmation in the wallet. A pin is permanent, so nothing is sent until the
 * visitor presses the button, and the first failure stops the queue.
 */
export default function PinTopDrawer({ open, onClose, net, contracts, onPinned }) {
  const w = useWallet()
  const [rows, setRows] = useState([])
  const [running, setRunning] = useState(false)
  const [cost, setCost] = useState(null)
  const frozen = useRef(false)

  useEffect(() => {
    if (!open) { frozen.current = false; setRows([]); setCost(null); setRunning(false); return }
    if (frozen.current || !contracts.length) return
    frozen.current = true
    setRows(contracts.map((c) => ({ address: c.address, calls: c.calls, name: defaultName(c.address), info: null, status: 'idle' })))
  }, [open, contracts])

  // look each row up (already pinned? already pinned by this wallet this week?)
  const sig = rows.map((r) => r.address).join()
  useEffect(() => {
    if (!open || !rows.length) return
    let live = true
    Promise.all(rows.map((r) => inspectTarget(net, r.address, w.account).catch((e) => ({ valid: false, error: friendlyError(e) })))).then((infos) => {
      if (live) setRows((rs) => rs.map((r, i) => ({ ...r, info: infos[i], name: infos[i]?.pinned ? infos[i].name : r.name })))
    })
    return () => { live = false }
  }, [open, sig, net, w.account])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e) => e.key === 'Escape' && !running && onClose()
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc) }
  }, [open, onClose, running])

  const todo = rows.filter((r) => r.info?.valid && !r.info.alreadyThisWeek && r.status !== 'done')

  // total gas for what is left, so the visitor sees the price before the first confirmation
  const todoSig = todo.map((r) => r.address + r.name).join()
  useEffect(() => {
    if (!open || !w.account || !todo.length || w.chainId !== net.chainId) { setCost(null); return }
    let live = true
    Promise.all(todo.map((r) => estimatePinCost(net, { target: r.address, name: r.name.trim() || defaultName(r.address), note: NOTE }, w.account))).then((c) => {
      if (live) setCost(c.every((x) => x != null) ? c.reduce((a, b) => a + b, 0) : null)
    })
    return () => { live = false }
  }, [open, todoSig, w.account, w.chainId, net])

  if (!open) return null
  const wrongChain = !!w.account && w.chainId !== net.chainId
  const patch = (address, p) => setRows((rs) => rs.map((r) => (r.address === address ? { ...r, ...p } : r)))
  const blocker = !w.hasWallet ? 'Install MetaMask to pin.' : !w.account ? 'Connect your wallet first.' : wrongChain ? `Switch to ${net.name}.` : !rows.length ? 'No contracts to pin yet.' : rows.some((r) => !r.info) ? 'Checking the contracts.' : !todo.length ? 'Nothing left to pin this week.' : todo.some((r) => !r.name.trim() && !r.info.pinned) ? 'Every contract needs a name.' : null
  const doneCount = rows.filter((r) => r.status === 'done').length

  async function run() {
    setRunning(true)
    for (const r of todo) {
      patch(r.address, { status: 'sending', error: null })
      try {
        const hash = await pinContract(net, { target: r.address, name: r.name.trim(), note: r.info.pinned ? '' : NOTE })
        patch(r.address, { status: 'done', hash })
        onPinned?.()
      } catch (e) { patch(r.address, { status: 'error', error: friendlyError(e) }); break }
    }
    setRunning(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80" onClick={() => !running && onClose()} role="dialog" aria-modal="true" aria-labelledby="pintop-title">
      <aside className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-rule bg-paper2 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="pintop-title" className="!text-3xl">Pin the top {rows.length || 5}</h2>
            <p className="mt-2 text-sm text-ink2">The busiest contracts on <span className="font-medium text-ink">{net.label}</span>, pinned one after another. Each pin is permanent and asks for its own confirmation in your wallet.</p>
          </div>
          <button onClick={onClose} className="btn-line btn-sm shrink-0" disabled={running} aria-label="Close">Close</button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-paper px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-ink2">{!w.hasWallet ? 'MetaMask not found in this browser' : !w.account ? 'Wallet not connected' : wrongChain ? `On the wrong network, needs ${net.name}` : <>Connected, <span className="num">{shortAddr(w.account)}</span></>}</p>
          {w.hasWallet && !w.account && <button className="btn btn-sm" onClick={w.connect} disabled={w.busy}>Connect wallet</button>}
          {wrongChain && <button className="btn btn-sm" onClick={() => w.switchTo(net)} disabled={w.busy}>Switch</button>}
        </div>
        {w.error && <p className="mt-2 text-sm text-danger" role="alert">{w.error}</p>}

        <ul className="mt-6 divide-y divide-rule rounded-lg border border-rule bg-paper">
          {rows.map((r) => (
            <li key={r.address} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <a className="num min-w-0 truncate text-sm text-ink2 underline-offset-4 hover:text-ink hover:underline" href={`${net.explorer}/address/${r.address}`} target="_blank" rel="noreferrer">{r.address}</a>
                <span className="num shrink-0 text-xs text-muted">{r.calls} calls</span>
              </div>
              <label className="sr-only" htmlFor={`n-${r.address}`}>Name for {r.address}</label>
              <input id={`n-${r.address}`} className="input mt-2 text-sm" value={r.name} maxLength={NAME_MAX} disabled={running || r.info?.pinned || r.status === 'done'} onChange={(e) => patch(r.address, { name: e.target.value })} />
              <p className={`mt-2 text-sm ${r.status === 'done' ? 'text-teal' : r.status === 'error' || (r.info && !r.info.valid) ? 'text-danger' : 'text-muted'}`} role="status">
                {r.status === 'done' ? <>Pinned. <a className="text-ink underline underline-offset-4" href={`${net.explorer}/tx/${r.hash}`} target="_blank" rel="noreferrer">View the transaction</a></>
                  : r.status === 'sending' ? 'Confirm in your wallet'
                  : r.status === 'error' ? r.error
                  : !r.info ? 'Checking'
                  : !r.info.valid ? r.info.error
                  : r.info.alreadyThisWeek ? 'You already pinned this one this week'
                  : r.info.pinned ? `Already on the board as "${r.info.name}", your pin adds one`
                  : 'Ready'}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <button className="btn w-full" disabled={!!blocker || running} onClick={run}>{running ? 'Pinning, confirm each one in your wallet' : doneCount ? `Pin the ${todo.length} left` : `Pin all ${todo.length || ''}`.trim()}</button>
          <p className={`mt-3 text-center text-sm ${blocker ? 'text-ink2' : 'text-teal'}`} role="status">{blocker || (cost != null ? `About ${fmtBot(cost)} in gas for ${todo.length} pin${todo.length === 1 ? '' : 's'}.` : 'Ready. Your wallet will ask you to confirm each pin.')}</p>
        </div>
      </aside>
    </div>
  )
}
