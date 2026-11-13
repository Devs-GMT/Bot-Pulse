import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav.jsx'
import TopBar from '../components/TopBar.jsx'
import Footer from '../components/Footer.jsx'
import PulseGraph from '../components/PulseGraph.jsx'
import BlockNetwork from '../components/BlockNetwork.jsx'
import ControlRoom from '../components/ControlRoom.jsx'
import Walkthrough from '../components/Walkthrough.jsx'
import Blueprint from '../components/Blueprint.jsx'
import { useBeatMood } from '../components/BeatCard.jsx'
import Reveal from '../components/Reveal.jsx'
import TickerStrip from '../components/TickerStrip.jsx'
import Faq from '../components/Faq.jsx'
import { NETWORKS } from '../config.js'
import { usePulse } from '../lib/usePulse.js'
import { readBoard } from '../lib/pinboard.js'
import { fmtGwei, fmtMs, fmtSec, fmtFixed } from '../lib/format.js'

const gap = 'py-[var(--section-gap)]'
const TABS = [['mainnet', 'Mainnet'], ['testnet', 'Testnet'], ['compare', 'Compare']]

// what the app really is, as big numbers: these are facts about this build, not claims about results
const NUMBERS = [
  ['2', 'Public RPC endpoints.'],
  ['2.5 s', 'Between refreshes.'],
  ['0', 'Servers, databases or trackers.'],
  ['69', 'Lines of Solidity in PinBoard. Read it on the explorer.'],
]

const FACTS = [
  ['What makes it healthy?', 'A recent block (never stricter than 5 seconds) and an RPC that answers in under 1,500 ms.'],
  ['What does a pin do?', 'It writes to PinBoard on-chain: one pin per wallet, per contract, per week, for gas only.'],
  ['Why is Nyut asleep?', 'Nyut sleeps after 30 seconds without a new block, sweats when gas spikes, and cheers when you pin a contract.'],
  ['Where do the numbers come from?', 'Straight from the public RPC endpoints, fetched by your browser. There is no BOT Pulse server in between.'],
]

const Check = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden className="shrink-0 text-teal"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

export default function Landing() {
  const main = usePulse('mainnet', 100)
  const test = usePulse('testnet', 100)
  const mood = useBeatMood(main)
  const navigate = useNavigate()
  const [net, setNet] = useState('mainnet')
  const [board, setBoard] = useState(null)

  useEffect(() => {
    const n = NETWORKS.mainnet.pinBoard ? NETWORKS.mainnet : NETWORKS.testnet
    readBoard(n).then((b) => setBoard({ ...b, label: n.label })).catch(() => {})
  }, [])

  const figs = (snap, label) => (
    <div>
      {label && <p className="font-display text-2xl font-semibold">{label}</p>}
      <dl className="num mt-4 grid grid-cols-2 gap-x-6 gap-y-6">
        {[['Block time', fmtSec(snap?.metrics?.avgBlockTime)], ['Tx per block', fmtFixed(snap?.metrics?.txPerBlock)], ['Gas price', fmtGwei(snap?.metrics?.gas)], ['RPC latency', fmtMs(snap?.latencyMs)]].map(([l, v]) => (
          <div key={l} className="border-t border-rule pt-3">
            <dt className="label">{l}</dt>
            <dd className={`mt-2 leading-none ${net === 'compare' ? 'text-[28px]' : 'text-[40px]'}`}>{snap && !snap.loading ? v : '…'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )

  return (
    <>
      <TopBar main={main} />
      <Nav />

      {/* 1. Hero: centred headline, then the live graph and the network of recent blocks */}
      <section className="dotgrid relative">
        <div className="container pb-16 pt-16 text-center md:pb-20 md:pt-24">
          <h1 className="mx-auto !max-w-none">Every block.<br /><span className="text-muted">Zero guesswork.</span></h1>
          <p className="lead mx-auto mt-6 text-ink2">The live heartbeat of BOT Chain, read straight from its public RPC.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/app" className="btn">Open the dashboard</Link>
            <a href="#live" className="btn-line">Watch it live</a>
          </div>
        </div>
      </section>

      <section className="pb-[var(--section-gap-s)]">
        <div className="container">
          <ControlRoom main={main} test={test} mood={mood} />
          <div className="mt-16"><PulseGraph main={main} test={test} board={board} mood={mood} /></div>
          <div className="mx-auto mt-10 max-w-[1100px]">
            <BlockNetwork recent={main?.recent} height={190} explorer={NETWORKS.mainnet.explorer} />
          </div>
        </div>
      </section>

      {/* 2. Pick your network: tabs that switch without a reload */}
      <section id="networks" className={`border-t border-rule ${gap}`}>
        <div className="container grid items-center gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <Reveal>
            <h2>Pick your network</h2>
            <div className="seg seg-lg mt-8" role="tablist" aria-label="Network" onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              const i = TABS.findIndex(([k]) => k === net), j = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length
              setNet(TABS[j][0]); e.preventDefault()
              requestAnimationFrame(() => document.querySelector('#networks [role=tab][aria-selected="true"]')?.focus())
            }}>
              {TABS.map(([k, l]) => <button key={k} role="tab" tabIndex={net === k ? 0 : -1} aria-selected={net === k} aria-pressed={net === k} onClick={() => setNet(k)}>{l}</button>)}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="panel p-8" role="tabpanel">
              {net === 'compare' ? (
                <div className="grid gap-8 sm:grid-cols-2">{figs(main, 'Mainnet')}{figs(test, 'Testnet')}</div>
              ) : figs(net === 'mainnet' ? main : test)}
              <Link to={`/app?view=${net}`} className="btn-line mt-8">Open {TABS.find(([k]) => k === net)[1]}</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. Live ticker, the counterpart of V7's logo bar */}
      <TickerStrip main={main} test={test} />

      {/* 4 to 6. Seven signals, what's busy, Testnet vs Mainnet, as one pinned walkthrough of the live dashboard */}
      <Walkthrough main={main} test={test} onPin={() => navigate('/app')} />

      {/* 7. Honest numbers */}
      <section id="honest" className={`border-t border-rule ${gap}`}>
        <div className="container">
          <Reveal><h2>Honest numbers</h2></Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NUMBERS.map(([n, t], i) => (
              <Reveal key={t} delay={i * 0.06}>
                <article className="panel glow flex h-full flex-col justify-between p-6">
                  <p className="font-display text-[64px] font-semibold leading-none tracking-tight">{n}</p>
                  <p className="mt-10 text-ink2">{t}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-4"><Blueprint /></Reveal>
          <Reveal className="mt-4">
            <ul className="flex flex-wrap gap-3">
              {[['PinBoard verified on Mainnet', `${NETWORKS.mainnet.explorer}/address/${NETWORKS.mainnet.pinBoard}#code`, NETWORKS.mainnet.pinBoard], ['PinBoard verified on Testnet', `${NETWORKS.testnet.explorer}/address/${NETWORKS.testnet.pinBoard}#code`, NETWORKS.testnet.pinBoard], ['No backend', null, true], ['Fonts hosted by us', null, true]].filter(([, , on]) => on).map(([t, href]) => (
                <li key={t}>
                  {href
                    ? <a href={href} target="_blank" rel="noreferrer" className="panel glow inline-flex min-h-[44px] items-center gap-2 px-4 text-sm"><Check />{t}</a>
                    : <span className="panel inline-flex min-h-[44px] items-center gap-2 px-4 text-sm"><Check />{t}</span>}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section id="faq" className={`border-t border-rule ${gap}`}>
        <div className="container grid gap-12 lg:grid-cols-[4fr_8fr] lg:gap-16">
          <Reveal><h2>Questions</h2></Reveal>
          <Reveal delay={0.08}><Faq items={FACTS} /></Reveal>
        </div>
      </section>

      {/* 8. Closing */}
      <section className="border-t border-rule">
        <div className="container py-[var(--section-gap-l)]">
          <Reveal>
            <p className="display-s max-w-[16ch] font-display text-[length:var(--text-display)] font-semibold leading-[1.02] tracking-tight">Check the pulse <span className="text-muted">before you ship.</span></p>
            <Link to="/app" className="btn mt-10">Open the dashboard</Link>
          </Reveal>
        </div>
      </section>

      <Footer main={main} />
    </>
  )
}
