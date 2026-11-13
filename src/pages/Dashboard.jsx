import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import Nav from '../components/Nav.jsx'
import PinDrawer from '../components/PinDrawer.jsx'
import PinTopDrawer from '../components/PinTopDrawer.jsx'
import TrendingBoard from '../components/TrendingBoard.jsx'
import MetricCard from '../components/MetricCard.jsx'
import HealthBadge from '../components/HealthBadge.jsx'
import CompareView from '../components/CompareView.jsx'
import SnapshotCard from '../components/SnapshotCard.jsx'
import CopyButton from '../components/CopyButton.jsx'
import BeatCard from '../components/BeatCard.jsx'
import { NETWORKS } from '../config.js'
import { usePulse } from '../lib/usePulse.js'
import { metricRows } from '../lib/metricRows.js'
import { fmtInt } from '../lib/format.js'

const isSystem = (a) => /^0x0{30,}[0-9a-f]{0,10}$/i.test(a) // 0x000...1000 style system contracts
const SPAN = ['lg:col-span-2', '', '', '', '', 'lg:col-span-2', 'lg:col-span-2']
const VIEWS = [['mainnet', 'Mainnet'], ['testnet', 'Testnet'], ['compare', 'Compare']]

export default function Dashboard() {
  const [view, setView] = useState(() => { const v = new URLSearchParams(window.location.search).get('view'); return VIEWS.some(([k]) => k === v) ? v : 'mainnet' })
  const [win, setWin] = useState(100)
  const compare = view === 'compare'
  const main = usePulse('mainnet', win, view === 'mainnet' || compare)
  const test = usePulse('testnet', win, view === 'testnet' || compare)
  const snap = view === 'testnet' ? test : main
  const net = NETWORKS[compare ? 'mainnet' : view]

  const [drawer, setDrawer] = useState({ open: false, target: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const [topOpen, setTopOpen] = useState(false)
  const openPin = (target) => setDrawer({ open: true, target })

  const cardRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [capture, setCapture] = useState(false) // the off-screen card exists only while a snapshot is taken
  const items = compare ? [{ net: NETWORKS.mainnet, snap: main }, { net: NETWORKS.testnet, snap: test }] : [{ net, snap }]

  async function share() {
    setSaving(true)
    setCapture(true)
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (!cardRef.current) return
      const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-paper').trim() })
      const a = document.createElement('a')
      a.download = `bot-pulse-${compare ? 'compare' : view}-${Date.now()}.png`
      a.href = url
      a.click()
    } finally {
      setCapture(false)
      setSaving(false)
    }
  }

  // compare needs both networks, otherwise the snapshot would carry empty cells
  const loading = compare ? !main || main.loading || !test || test.loading : !snap || snap.loading
  const noData = compare ? main?.blockNumber == null || test?.blockNumber == null : snap?.blockNumber == null
  const rows = metricRows(snap)

  return (
    <>
      <Nav />
      <main className="container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="!text-[40px]">Dashboard</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="seg" role="group" aria-label="Network">
              {VIEWS.map(([k, l]) => <button key={k} aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>)}
            </div>
            <div className="seg" role="group" aria-label="Window">
              {[100, 1000].map((n) => <button key={n} aria-pressed={win === n} onClick={() => setWin(n)}>{fmtInt(n)} blocks</button>)}
            </div>
            <button className="btn-line btn-sm" onClick={share} disabled={saving || loading || noData} title={noData && !loading ? 'No data to export yet' : undefined}>{saving ? 'Rendering' : 'Share snapshot'}</button>
          </div>
        </div>

        {compare ? (
          <div className="mt-8"><CompareView main={main} test={test} /></div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
              <HealthBadge health={snap?.health} loading={loading} />
              <span className="num text-sm text-muted">
                {!loading && snap.blockNumber != null
                  ? `Block #${fmtInt(snap.blockNumber)}, ${snap.lastBlockAgeSec != null ? snap.lastBlockAgeSec.toFixed(1) : 'n/a'}s ago`
                  : win === 1000 ? 'Loading 1,000 blocks' : 'Loading'}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-1 lg:col-start-4 lg:row-span-2 lg:row-start-1"><BeatCard snap={snap} /></div>
              {rows.map((r, i) => <MetricCard key={r.key} loading={loading} className={SPAN[i]} {...r} />)}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[7fr_5fr]">
              <section className="panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl">Most active contracts</h3>
                    <p className="mt-1 text-sm text-muted">Calls in the last {snap?.metrics?.blocks ?? win} blocks</p>
                  </div>
                  {net.pinBoard && !loading && snap.active.some((c) => !isSystem(c.address)) && <button className="btn-line btn-sm" onClick={() => setTopOpen(true)}>Pin the top 5</button>}
                </div>
                {loading ? <p className="mt-4 text-sm text-muted">Loading</p> : snap.active.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">No contract calls in this window.</p>
                ) : (
                  <ul className="mt-4">
                    {snap.active.map((c) => (
                      <li key={c.address} className="row-link flex items-center gap-3 py-2.5">
                        <a className="num min-w-0 flex-1 truncate text-sm text-ink2 underline-offset-4 hover:text-ink hover:underline" href={`${net.explorer}/address/${c.address}`} target="_blank" rel="noreferrer">{c.address}</a>
                        {isSystem(c.address) && <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-muted">system</span>}
                        <CopyButton small text={c.address} />
                        <span className="num w-10 text-right text-sm">{c.calls}</span>
                        {!isSystem(c.address) && <button className="btn-line btn-sm" onClick={() => openPin(c.address)}>Pin</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <TrendingBoard app net={net} refreshKey={refreshKey} onPin={openPin} />
            </div>
          </>
        )}
      </main>

      {capture && <SnapshotCard ref={cardRef} items={items} windowSize={win} />}
      <PinTopDrawer open={topOpen} net={net} contracts={(snap?.active || []).filter((c) => !isSystem(c.address)).slice(0, 5)}
        onClose={() => setTopOpen(false)} onPinned={() => setRefreshKey((k) => k + 1)} />
      <PinDrawer open={drawer.open} initialTarget={drawer.target} net={net}
        onClose={() => setDrawer({ open: false, target: '' })} onPinned={() => setRefreshKey((k) => k + 1)} />
    </>
  )
}
