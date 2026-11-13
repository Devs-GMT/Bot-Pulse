import { fmtInt } from '../lib/format.js'

/** Marquee of live facts. Items are parted by a thin rule, not by bullets. */
export default function TickerStrip({ main, test }) {
  const items = []
  const add = (label, s) => {
    if (!s || s.loading) return
    items.push(`${label}: last block ${s.lastBlockAgeSec != null ? s.lastBlockAgeSec.toFixed(1) : 'n/a'}s ago`)
    items.push(`${label}: block #${fmtInt(s.blockNumber)}`)
    items.push(`${label}: ${fmtInt(s.metrics.newContracts)} contracts deployed in the last ${s.metrics.blocks} blocks`)
    items.push(`${label}: RPC answered in ${s.latencyMs != null ? Math.round(s.latencyMs) : 'n/a'} ms`)
  }
  add('Mainnet', main)
  add('Testnet', test)
  const row = items.length ? items : ['Connecting to BOT Chain']
  return (
    <div id="live" className="overflow-hidden border-y border-rule py-5" aria-label="Live network facts">
      <div className="marquee flex w-max">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0" aria-hidden={k === 1}>
            {row.map((t, i) => <span key={i} className="num whitespace-nowrap border-l border-rule px-8 text-sm text-ink2">{t}</span>)}
          </div>
        ))}
      </div>
    </div>
  )
}
