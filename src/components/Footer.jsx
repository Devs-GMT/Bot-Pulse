import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EcgMonitor from './EcgMonitor.jsx'
import { NETWORKS } from '../config.js'
import { readBoard } from '../lib/pinboard.js'
import { fmtInt } from '../lib/format.js'

const STATUS = {
  healthy: { text: 'Healthy', cls: 'text-teal' },
  slow: { text: 'Slow', cls: 'text-amber' },
  down: { text: 'Down', cls: 'text-danger' },
}

/** Footer: a hospital ECG monitor driven by live mainnet blocks. Intentionally has no GitHub link. */
export default function Footer({ main }) {
  const net = NETWORKS.mainnet
  const [board, setBoard] = useState(null)
  useEffect(() => {
    let live = true
    const load = () => readBoard(net).then((b) => live && setBoard(b)).catch(() => {})
    load()
    const t = setInterval(load, 30_000)
    return () => { live = false; clearInterval(t) }
  }, [net])

  const st = STATUS[main?.health?.status]
  const pins = board?.deployed ? board.pins.reduce((s, p) => s + p.totalPins, 0) : null
  const avg = main?.metrics?.avgBlockTime
  const cell = 'border-l border-rule pl-4 first:border-0 first:pl-0'

  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-[1440px] px-4 pt-20 md:px-8 lg:px-16">
        <div className="panel overflow-hidden !bg-paper">
          <div className="grid lg:grid-cols-[1.7fr_1fr]">
            <div className="border-b border-rule lg:border-b-0 lg:border-r">
              <div className="num flex flex-wrap items-center gap-x-4 gap-y-2 px-6 pt-5 text-sm text-muted">
                <img key={main?.newBlockAt || 0} src="/brand/botpulse-logo.svg" alt="" width={34} height={34} className="heartbeat rounded-lg" />
                <span className={cell}>Block <span className="text-ink">#{main?.blockNumber != null ? fmtInt(main.blockNumber) : 'n/a'}</span></span>
                <span className={cell}>{avg != null ? `${avg.toFixed(1)}s` : 'n/a'}</span>
                <span className={`${cell} ${st?.cls || ''}`}>{st?.text || 'Connecting'}</span>
              </div>
              <EcgMonitor pulseKey={main?.newBlockAt || 0} height={150} />
            </div>

            <div className="flex flex-col justify-between gap-5 p-6">
              <div>
                <p className="label">PinBoard on Mainnet</p>
                <p className="num mt-2 break-all text-sm text-ink">{net.pinBoard || 'Not deployed yet'}</p>
              </div>
              <div className="num flex gap-8 text-base">
                <span><span className="text-muted">Pins </span><span className="text-accent">{pins != null ? fmtInt(pins) : 'n/a'}</span></span>
                <span><span className="text-muted">Contracts </span><span className="text-teal">{board?.deployed ? fmtInt(board.total) : 'n/a'}</span></span>
              </div>
              {net.pinBoard
                ? <a className="btn-line self-start" href={`${net.explorer}/address/${net.pinBoard}`} target="_blank" rel="noreferrer">View on explorer</a>
                : <span className="btn-line self-start cursor-default opacity-60">Explorer link after deploy</span>}
            </div>
          </div>
        </div>

        <div className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <p className="font-display text-3xl font-semibold leading-tight tracking-tight">Every block.<br /><span className="text-muted">Zero guesswork.</span></p>
          <FooterCol title="Product" items={[['Dashboard', '/app'], ['Compare', '/app?view=compare'], ['Trending', '/#trending'], ['FAQ', '/#faq']]} />
          <FooterCol title="BOT Chain" items={[['Mainnet explorer', net.explorer, true], ['Testnet explorer', NETWORKS.testnet.explorer, true], ['Testnet faucet', NETWORKS.testnet.faucet, true], ['BOT Chain on X', 'https://x.com/BOTChain_ai', true]]} />
          <FooterCol title="Contract" items={[
            ['PinBoard on Mainnet', net.pinBoard ? `${net.explorer}/address/${net.pinBoard}` : null, true],
            ['PinBoard on Testnet', NETWORKS.testnet.pinBoard ? `${NETWORKS.testnet.explorer}/address/${NETWORKS.testnet.pinBoard}` : null, true],
          ]} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-6 text-sm text-muted">
          <span>© 2026 BOT Pulse. Numbers come straight from public RPCs.</span>
          <span className="num">Mainnet 677, Testnet 968</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, items }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <ul className="mt-4 space-y-3 text-sm">
        {items.map(([label, href, ext]) => (
          <li key={label}>
            {!href ? <span className="text-muted/60">{label}, soon</span>
              : ext ? <a className="text-muted transition-colors hover:text-ink" href={href} target="_blank" rel="noreferrer">{label}</a>
              : <Link className="text-muted transition-colors hover:text-ink" to={href}>{label}</Link>}
          </li>
        ))}
      </ul>
    </div>
  )
}
