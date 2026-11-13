import { useEffect, useRef, useState } from 'react'
import MetricCard from './MetricCard.jsx'
import CompareView from './CompareView.jsx'
import TrendingBoard from './TrendingBoard.jsx'
import CopyButton from './CopyButton.jsx'
import { NETWORKS } from '../config.js'
import { metricRows } from '../lib/metricRows.js'

const isSystem = (a) => /^0x0{30,}[0-9a-f]{0,10}$/i.test(a)

const useMedia = (q) => {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q), f = () => setOn(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [q])
  return on
}

const STEPS = [
  { id: 'signals', title: 'Seven signals, one heartbeat', text: 'Block time, gas, latency and more. Each tile says which blocks it covers.' },
  { id: 'trending', title: 'What’s busy on BOT Chain', text: 'The contracts being called most, right now.' },
  { id: 'pin', title: 'Pin what matters', text: 'Put a contract on the Trending Board. Free apart from gas.' },
  { id: 'compare', title: 'Testnet vs Mainnet', text: 'The same signals, side by side.' },
]

/**
 * The product demo: a pinned panel that shows the real, live dashboard parts while the text on the left changes as
 * you scroll (the V7 "sticky walkthrough"). Under 64rem each step simply carries its own panel.
 */
export default function Walkthrough({ main, test, onPin }) {
  const [active, setActive] = useState(0)
  const refs = useRef([])
  const desktop = useMedia('(min-width: 1024px)')
  const ready = main && !main.loading
  const rows = metricRows(main)

  useEffect(() => {
    if (!desktop || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.step)) }), { rootMargin: '-42% 0px -42% 0px' })
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [desktop])

  const visual = [
    // 1. four of the seven tiles, live
    <div key="v1" className="grid gap-4 sm:grid-cols-2">
      {['blockTime', 'txs', 'gas', 'latency'].map((k) => { const r = rows.find((x) => x.key === k); return <MetricCard key={k} loading={!ready} {...r} /> })}
    </div>,
    // 2. most active contracts
    <section key="v2" className="panel p-6">
      <h3 className="text-2xl">Most active contracts</h3>
      <p className="mt-1 text-sm text-muted">Mainnet, last {main?.metrics?.blocks ?? 100} blocks</p>
      <ul className="mt-4">
        {!ready ? <li className="dots py-3 text-sm text-muted">Loading</li> : main.active.slice(0, 7).map((c) => (
          <li key={c.address} className="row-link flex items-center gap-3 py-3">
            <a className="num min-w-0 flex-1 truncate text-sm text-ink2 underline-offset-4 hover:text-ink hover:underline" href={`${NETWORKS.mainnet.explorer}/address/${c.address}`} target="_blank" rel="noreferrer">{c.address}</a>
            {isSystem(c.address) && <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-muted">system</span>}
            <CopyButton text={c.address} className="!min-h-[44px]" />
            <span className="num text-base">{c.calls}</span>
          </li>
        ))}
      </ul>
    </section>,
    // 3. the board
    <TrendingBoard key="v3" net={NETWORKS.mainnet} onPin={onPin} />,
    // 4. compare
    <CompareView key="v4" main={main} test={test} />,
  ]

  return (
    <section id="product" className="border-t border-rule">
      <div className="container grid gap-12 py-[var(--section-gap)] lg:grid-cols-[5fr_7fr] lg:gap-16">
        <div>
          {STEPS.map((s, i) => (
            <div key={s.id} id={s.id} data-step={i} ref={(el) => (refs.current[i] = el)} className="scroll-mt-28 lg:flex lg:min-h-[72vh] lg:flex-col lg:justify-center">
              <div className={desktop ? 'transition-opacity duration-300 ' + (active === i ? 'opacity-100' : 'opacity-35') : 'pt-16 first:pt-0'}>
                <h2>{s.title}</h2>
                <p className="lead mt-5 text-ink2">{s.text}</p>
              </div>
              {!desktop && <div className="mt-8">{visual[i]}</div>}
            </div>
          ))}
        </div>
        {desktop && (
          <div className="self-start lg:sticky lg:top-24">
            <div className="grid">
              {visual.map((v, i) => (
                <div key={i} className="col-start-1 row-start-1 transition-[opacity,transform] duration-300" style={{ opacity: active === i ? 1 : 0, transform: active === i ? 'none' : 'translateY(12px)', visibility: active === i ? 'visible' : 'hidden' }} aria-hidden={active !== i}>{v}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
