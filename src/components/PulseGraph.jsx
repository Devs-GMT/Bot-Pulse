import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import Beat from './Beat.jsx'
import { NETWORKS } from '../config.js'
import { fmtFixed, fmtGwei, fmtInt, fmtMs, fmtSec } from '../lib/format.js'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// six connectors: a node's anchor to the matching anchor on the centre panel (left side, then right side)
const PAIRS = [['l1', 'c-l1'], ['l2', 'c-l2'], ['l3', 'c-l3'], ['r1', 'c-r1'], ['r2', 'c-r2'], ['r3', 'c-r3']]

/**
 * The page's signature, V7 Context Graph style: BOT Chain in the middle, what BOT Pulse reads on each side, dashed
 * connectors with an orange anchor at each end. Every new block sends a pulse along them. All values are live.
 * Each node is a link (hover or focus lights its connector). Under 48rem the connectors drop away.
 */
export default function PulseGraph({ main, test, board, mood }) {
  const box = useRef(null)
  const dots = useRef({})
  const pathRefs = useRef([])
  const pulseRefs = useRef([])
  const [paths, setPaths] = useState([])
  const [hot, setHot] = useState(null)

  useLayoutEffect(() => {
    const measure = () => {
      const b = box.current?.getBoundingClientRect()
      if (!b) return
      if (b.width < 768) { setPaths([]); return }
      const pt = (k) => { const r = dots.current[k]?.getBoundingClientRect(); return r ? [r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top] : null }
      setPaths(PAIRS.map(([a, c]) => {
        const p = pt(a), q = pt(c)
        if (!p || !q) return ''
        const xm = (p[0] + q[0]) / 2
        return `M${p[0].toFixed(1)} ${p[1].toFixed(1)} C${xm.toFixed(1)} ${p[1].toFixed(1)} ${xm.toFixed(1)} ${q[1].toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`
      }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  // a pulse runs along a connector; `back` runs it from the centre outwards
  const fire = (i, back = false, delay = 0) => {
    const path = pathRefs.current[i], dot = pulseRefs.current[i]
    if (!path || !dot || reduced()) return
    const len = path.getTotalLength(), o = { t: 0 }
    gsap.to(dot, { opacity: 0, duration: 0.2, delay: delay + 0.85 })
    gsap.to(o, {
      t: 1, duration: 0.9, delay, ease: 'power1.inOut',
      onUpdate: () => { const p = path.getPointAtLength((back ? 1 - o.t : o.t) * len); dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); dot.style.opacity = 1 },
    })
  }
  useEffect(() => { if (main?.newBlockAt) { fire(0); fire(3, true, 0.9); fire(4, true, 0.9); fire(5, true, 0.9) } }, [main?.newBlockAt, paths.length])
  useEffect(() => { if (test?.newBlockAt) fire(1) }, [test?.newBlockAt, paths.length])

  const ready = (s) => s && !s.loading
  const m = ready(main) ? main.metrics : null
  const pin = board?.label === 'Mainnet' ? NETWORKS.mainnet : NETWORKS.testnet
  const nodes = [
    { k: 'l1', side: 'l', pos: 'md:left-0 md:top-0', label: 'Mainnet RPC', value: ready(main) ? fmtMs(main.latencyMs) : '…', note: 'chain 677', to: '/app?view=mainnet', hint: 'Open the Mainnet dashboard' },
    { k: 'l2', side: 'l', pos: 'md:left-0 md:top-[165px]', label: 'Testnet RPC', value: ready(test) ? fmtMs(test.latencyMs) : '…', note: 'chain 968', to: '/app?view=testnet', hint: 'Open the Testnet dashboard' },
    { k: 'l3', side: 'l', pos: 'md:left-0 md:top-[330px]', label: 'PinBoard', value: board ? (board.deployed ? `${fmtInt(board.total)} pinned` : 'Not deployed') : '…', note: board?.label || '', href: pin.pinBoard ? `${pin.explorer}/address/${pin.pinBoard}#code` : null, to: pin.pinBoard ? null : '/app', hint: 'Read the PinBoard contract on the explorer' },
    { k: 'r1', side: 'r', pos: 'md:right-0 md:top-0', label: 'Latest block', value: ready(main) ? `#${fmtInt(main.blockNumber)}` : '…', note: 'Mainnet', href: ready(main) ? `${NETWORKS.mainnet.explorer}/block/${main.blockNumber}` : null, to: ready(main) ? null : '/app', hint: 'Open this block on the explorer' },
    { k: 'r2', side: 'r', pos: 'md:right-0 md:top-[165px]', label: 'Gas price', value: m ? fmtGwei(m.gas) : '…', note: 'Mainnet', to: '/app', hint: 'See gas on the dashboard' },
    { k: 'r3', side: 'r', pos: 'md:right-0 md:top-[330px]', label: 'Block time', value: m ? fmtSec(m.avgBlockTime) : '…', note: m ? `${fmtFixed(m.txPerBlock)} tx per block` : '', to: '/app', hint: 'See block time on the dashboard' },
  ]
  const cDots = [['c-l1', 'md:left-[-5px] md:top-[14%]'], ['c-l2', 'md:left-[-5px] md:top-[50%]'], ['c-l3', 'md:left-[-5px] md:top-[86%]'], ['c-r1', 'md:right-[-5px] md:top-[14%]'], ['c-r2', 'md:right-[-5px] md:top-[50%]'], ['c-r3', 'md:right-[-5px] md:top-[86%]']]
  const dot = (id, cls, on) => <span key={id} ref={(el) => (dots.current[id] = el)} className={`anchor absolute hidden h-[10px] w-[10px] rounded-full transition-transform duration-200 md:block ${on ? 'scale-150' : ''} ${cls}`} aria-hidden />

  // one stable element type per node (a link), so hover state never remounts it
  const nodeEl = (n, i) => {
    const props = {
      key: n.k,
      className: `panel glow relative block p-4 transition-colors md:absolute md:w-[26%] md:max-w-[260px] ${n.pos}`,
      'aria-label': `${n.label}, ${n.value}. ${n.hint}`,
      onPointerEnter: () => setHot(i), onPointerLeave: () => setHot(null), onFocus: () => setHot(i), onBlur: () => setHot(null),
    }
    const inner = (
      <>
        <p className="label">{n.label}</p>
        <p className="num mt-1 text-xl">{n.value}</p>
        <p className="label mt-0.5">{n.note}</p>
        {dot(n.k, n.side === 'l' ? 'md:right-[-5px] md:top-1/2 md:-translate-y-1/2' : 'md:left-[-5px] md:top-1/2 md:-translate-y-1/2', hot === i)}
      </>
    )
    return n.href
      ? <a {...props} href={n.href} target="_blank" rel="noreferrer">{inner}</a>
      : <Link {...props} to={n.to}>{inner}</Link>
  }

  return (
    <div ref={box} className="relative mx-auto w-full max-w-[1100px] md:h-[450px]">
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block" aria-hidden>
        {paths.map((d, i) => <path key={i} ref={(el) => (pathRefs.current[i] = el)} d={d} className={`flow-line${hot === i ? ' hot' : ''}`} />)}
        {paths.map((_, i) => <circle key={'p' + i} ref={(el) => (pulseRefs.current[i] = el)} r="5" cx="-20" cy="-20" opacity="0" style={{ fill: 'var(--color-teal)' }} />)}
      </svg>

      <div className="grid grid-cols-2 gap-4 md:block">
        {nodes.map((n, i) => nodeEl(n, i))}

        <div className="panel relative order-first col-span-2 flex flex-col items-center justify-center px-4 py-8 md:absolute md:left-1/2 md:top-0 md:h-full md:w-[38%] md:max-w-[400px] md:-translate-x-1/2">
          <Beat mood={mood} pulseKey={main?.newBlockAt || 0} size={340} />
          <p className="mt-2 font-display text-xl font-semibold">BOT Chain</p>
          <p className="label">Mainnet 677, Testnet 968</p>
          {cDots.map(([id, cls]) => dot(id, cls, hot === PAIRS.findIndex(([, c]) => c === id)))}
        </div>
      </div>
    </div>
  )
}
