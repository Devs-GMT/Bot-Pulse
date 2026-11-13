import { forwardRef } from 'react'
import { metricRows } from '../lib/metricRows.js'
import { fmtInt } from '../lib/format.js'

const mono = { fontFamily: 'var(--font-outlier)' }
const display = { fontFamily: 'var(--font-display)', fontWeight: 600 }
const clip = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }

/**
 * Fixed-size 1200x630 card rendered off-screen and exported to PNG by html-to-image.
 * One network: all seven signals in 4 columns x 2 rows. Compare: four signals per network, side by side.
 * The footer line has its own reserved strip, so nothing can run into it.
 */
const SnapshotCard = forwardRef(function SnapshotCard({ items, windowSize }, ref) {
  const stamp = new Date().toUTCString().replace(' GMT', ' UTC')
  const status = (s) => (s?.health?.status === 'healthy' ? 'var(--color-teal)' : 'var(--color-amber)')
  const single = items.length === 1
  return (
    <div style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden>
      <div ref={ref} style={{ width: 1200, height: 630, background: 'var(--color-paper)', color: 'var(--color-ink)', fontFamily: 'var(--font-body)', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '48px 56px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/brand/botpulse-logo.svg" width={48} height={48} alt="" />
            <span style={{ ...display, fontSize: 32 }}>BOT Pulse</span>
          </div>
          <span style={{ ...mono, fontSize: 16, color: 'var(--color-muted)' }}>{stamp}</span>
        </div>

        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, columnGap: 48, marginTop: 32, alignContent: 'start' }}>
          {items.map(({ net, snap }) => {
            const rows = metricRows(snap).filter((r) => single || ['blockTime', 'gas', 'latency', 'txs'].includes(r.key))
            return (
              <div key={net.key} style={{ minWidth: 0 }}>
                <div style={{ ...display, fontSize: 44, lineHeight: 1 }}>{net.label}</div>
                <div style={{ ...mono, fontSize: 18, color: status(snap), marginTop: 12 }}>
                  {snap?.health?.status ? snap.health.status[0].toUpperCase() + snap.health.status.slice(1) : 'n/a'}, block #{fmtInt(snap?.blockNumber)}
                </div>
                <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: single ? 'repeat(4, minmax(0, 1fr))' : 'minmax(0, 1fr)', gap: single ? '22px 24px' : 10 }}>
                  {rows.map((r) => (
                    <div key={r.key} style={{ display: 'flex', flexDirection: single ? 'column' : 'row', justifyContent: 'space-between', alignItems: single ? 'flex-start' : 'baseline', gap: single ? 8 : 12, borderTop: '1px solid var(--color-rule)', paddingTop: 12, minWidth: 0 }}>
                      <span style={{ fontSize: 16, color: 'var(--color-muted)', ...clip }}>{r.label}</span>
                      <span style={{ ...mono, fontSize: single ? 32 : 26, lineHeight: 1.1, ...clip, maxWidth: '100%' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ ...mono, flex: 'none', height: 64, display: 'flex', alignItems: 'center', fontSize: 16, color: 'var(--color-muted)' }}>
          Last {windowSize} blocks, public RPC, no backend
        </div>
      </div>
    </div>
  )
})

export default SnapshotCard
