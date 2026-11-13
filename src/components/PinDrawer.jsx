import { useEffect, useRef, useState } from 'react'
import { useWallet } from '../lib/WalletContext.jsx'
import { shortAddr } from '../lib/wallet.js'
import { NAME_MAX, NOTE_MAX, friendlyError, inspectTarget, pinContract } from '../lib/pinboard.js'

const Tick = ({ on }) => (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden className={`mt-0.5 shrink-0 ${on ? 'text-teal' : 'text-rule'}`}>
    <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    {on && <path d="M6 10.5l2.8 2.8L14 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
)

/** One line of the "before you pin" checklist: what it is, where it stands, and the action that fixes it. */
function Step({ done, title, state, tone = 'text-muted', action }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <Tick on={done} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className={`mt-0.5 break-words text-sm ${tone}`}>{state}</p>
      </div>
      {action}
    </li>
  )
}

export default function PinDrawer({ open, onClose, net, initialTarget = '', onPinned }) {
  const w = useWallet()
  const [target, setTarget] = useState(initialTarget)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [info, setInfo] = useState(null)
  const [state, setState] = useState('idle') // idle | checking | sending | done
  const [error, setError] = useState(null)
  const [hash, setHash] = useState(null)
  const first = useRef(null)

  const reset = (t = '') => { setTarget(t); setName(''); setNote(''); setInfo(null); setError(null); setHash(null); setState('idle') }
  useEffect(() => { if (open) { reset(initialTarget); setTimeout(() => first.current?.focus(), 60) } }, [open, initialTarget, net.key])

  // lock the page behind the panel and close on Escape
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc) }
  }, [open, onClose])

  // look the target up whenever it looks like an address
  const addrOk = /^0x[0-9a-fA-F]{40}$/.test(target.trim())
  useEffect(() => {
    if (!open || !addrOk) { setInfo(null); return }
    let live = true
    setState((s) => (s === 'done' ? s : 'checking'))
    inspectTarget(net, target.trim(), w.account)
      .then((i) => { if (!live) return; setInfo(i); if (i.valid && i.pinned) { setName(i.name); setNote(i.note) } })
      .catch((e) => live && setInfo({ valid: false, error: friendlyError(e) }))
      .finally(() => live && setState((s) => (s === 'checking' ? 'idle' : s)))
    return () => { live = false }
  }, [open, target, net, w.account, addrOk])

  if (!open) return null

  const wrongChain = !!w.account && w.chainId !== net.chainId
  const checking = state === 'checking'
  // the one thing standing between the visitor and the pin, in plain words
  const blocker =
    !w.hasWallet ? 'Install MetaMask to pin.'
    : !w.account ? 'Connect your wallet first.'
    : wrongChain ? `Switch to ${net.name}.`
    : !addrOk ? 'Paste the contract address.'
    : checking ? 'Checking the address.'
    : !info?.valid ? (info?.error || 'That address cannot be pinned.')
    : info.alreadyThisWeek ? 'You already pinned this one this week. Come back next week.'
    : !info.pinned && !name.trim() ? 'Give the contract a name.'
    : null

  async function send() {
    setError(null); setState('sending')
    try {
      const h = await pinContract(net, { target: info.address, name: name.trim(), note: note.trim() })
      setHash(h); setState('done'); onPinned?.()
    } catch (e) { setError(friendlyError(e)); setState('idle') }
  }

  const contractState = !addrOk ? 'Waiting for an address' : checking ? 'Checking' : info?.valid ? (info.pinned ? `Valid contract, already on the board (${info.totalPins} pin${info.totalPins === 1 ? '' : 's'})` : 'Valid contract') : (info?.error || 'Checking')

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="pin-title">
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-rule bg-paper2 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="pin-title" className="!text-3xl">Pin a contract</h2>
            <p className="mt-2 text-sm text-ink2">Add it to the Trending Board on <span className="font-medium text-ink">{net.label}</span>. It costs only gas, and each wallet can pin a contract once a week.</p>
          </div>
          <button onClick={onClose} className="btn-line btn-sm shrink-0" aria-label="Close">Close</button>
        </div>

        {state === 'done' ? (
          <div className="mt-8 rounded-lg border border-rule bg-paper p-6">
            <p className="font-display text-2xl font-semibold text-teal">Pinned</p>
            <p className="mt-2 text-sm text-ink2">It is on the board now, and the board refreshes on its own.</p>
            <a className="mt-4 inline-block text-sm text-ink underline underline-offset-4" href={`${net.explorer}/tx/${hash}`} target="_blank" rel="noreferrer">View the transaction</a>
            <div className="mt-6 flex gap-3"><button className="btn" onClick={() => reset('')}>Pin another</button><button className="btn-line" onClick={onClose}>Done</button></div>
          </div>
        ) : (
          <>
            <h3 className="mt-8 !text-base !font-medium text-muted">Before you pin</h3>
            <ul className="mt-1 divide-y divide-rule rounded-lg border border-rule bg-paper px-4">
              <Step done={!!w.account} title="Wallet"
                state={!w.hasWallet ? 'MetaMask not found in this browser' : w.account ? `Connected, ${shortAddr(w.account)}` : 'Not connected'}
                tone={w.account ? 'text-teal' : 'text-amber'}
                action={w.hasWallet && !w.account ? <button className="btn btn-sm shrink-0" onClick={w.connect} disabled={w.busy}>Connect wallet</button> : null} />
              <Step done={!!w.account && !wrongChain} title="Network"
                state={!w.account ? `Needs ${net.name}` : wrongChain ? `On the wrong network, needs ${net.name}` : net.name}
                tone={w.account && !wrongChain ? 'text-teal' : w.account ? 'text-amber' : 'text-muted'}
                action={wrongChain ? <button className="btn btn-sm shrink-0" onClick={() => w.switchTo(net)} disabled={w.busy}>Switch</button> : null} />
              <Step done={!!info?.valid} title="Contract" state={contractState} tone={info?.valid ? 'text-teal' : info && !info.valid ? 'text-danger' : 'text-muted'} />
            </ul>
            {w.error && <p className="mt-2 text-sm text-danger" role="alert">{w.error}</p>}

            <label className="label mt-6 block" htmlFor="pin-target">Contract address</label>
            <input id="pin-target" ref={first} className="input num mt-1 text-sm" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0x followed by 40 characters" spellCheck={false} autoComplete="off" />

            <label className="label mt-5 block" htmlFor="pin-name">Name <span className="num">({name.length}/{NAME_MAX})</span></label>
            <input id="pin-name" className="input mt-1 text-sm" value={name} maxLength={NAME_MAX} disabled={info?.pinned} onChange={(e) => setName(e.target.value)} placeholder="Main DEX router" />
            <label className="label mt-4 block" htmlFor="pin-note">Note, optional <span className="num">({note.length}/{NOTE_MAX})</span></label>
            <input id="pin-note" className="input mt-1 text-sm" value={note} maxLength={NOTE_MAX} disabled={info?.pinned} onChange={(e) => setNote(e.target.value)} placeholder="Why does it matter?" />
            {info?.pinned && <p className="mt-2 text-sm text-muted">The name and note were set by the first pinner and stay as they are.</p>}

            <div className="mt-auto pt-8">
              <button className="btn w-full" disabled={!!blocker || state === 'sending'} onClick={send}>{state === 'sending' ? 'Confirm in your wallet' : 'Pin it'}</button>
              <p className={`mt-3 text-center text-sm ${blocker ? 'text-ink2' : 'text-teal'}`} role="status">{state === 'sending' ? 'Waiting for the confirmation.' : blocker || 'Ready. Your wallet will ask you to confirm.'}</p>
              {error && <p className="mt-2 text-center text-sm text-danger" role="alert">{error}</p>}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
