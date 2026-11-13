import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import Beat from './Beat.jsx'
import BlockNetwork from './BlockNetwork.jsx'
import { NETWORKS } from '../config.js'
import { fmtFixed, fmtGwei, fmtInt, fmtMs, fmtPct, fmtSec } from '../lib/format.js'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The scene lives in a 1200 x 460 box. The floor is the heartbeat line itself, and Nyut stands on it.
const W = 1200, H = 460, FLOOR = 420, DESK = 330
const STATIONS = [112, 362, 838, 1088]
const WALL = { x: 430, y: 44, w: 340, h: 160 }
const NYUT_W = 320
const NYUT_LEFT = (W - NYUT_W) / 2 // Nyut's own ground line runs from here to here + NYUT_W
const STROKE = (9 * NYUT_W) / 400 // Nyut's outline weight at this scale, so the floor and the body are one line

// the graph above the room: a wall screen feeds a node over each head, and one over Nyut
const NODES = [{ x: 112, y: 112 }, { x: 362, y: 138 }, { x: 838, y: 138 }, { x: 1088, y: 112 }, { x: 600, y: 256 }]
const EDGES = [
  { a: [WALL.x, 124], to: 1, wave: 0 }, { a: [NODES[1].x, NODES[1].y], to: 0, wave: 1 },
  { a: [WALL.x + WALL.w, 124], to: 2, wave: 0 }, { a: [NODES[2].x, NODES[2].y], to: 3, wave: 1 },
  { a: [600, WALL.y + WALL.h], to: 4, wave: 0 },
]
const edgePath = ({ a, to }) => {
  const b = [NODES[to].x, NODES[to].y]
  return to === 4 ? `M${a[0]} ${a[1]} L${b[0]} ${b[1]}` : `M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${Math.min(a[1], b[1]) - 30} ${b[0]} ${b[1]}`
}

// a small heartbeat blip drawn into the floor line
const blip = (x) => `H${x} q4 -7 8 0 h6 l3 3 l4 -20 l4 24 l3 -7 h8 q5 -9 10 0`
const FLOOR_L = `M-10 ${FLOOR} ${blip(40)} H214 ${blip(236)} H${NYUT_LEFT}`
const FLOOR_R = `M${NYUT_LEFT + NYUT_W} ${FLOOR} H940 ${blip(960)} H1140 ${blip(1150)} H1210`

const LOOK = 9 // degrees a head turns toward the pointer

const Hair = ({ v, cx }) => {
  if (v === 0) return (<><path d={`M${cx - 16} 233 C${cx - 18} 216 ${cx + 18} 216 ${cx + 16} 233`} /><path d={`M${cx - 18} 236 C${cx - 22} 214 ${cx + 22} 214 ${cx + 18} 236`} style={{ stroke: 'var(--color-accent)' }} /><rect x={cx - 21} y="231" width="6" height="12" rx="3" fill="var(--color-accent)" /><rect x={cx + 15} y="231" width="6" height="12" rx="3" fill="var(--color-accent)" /></>)
  if (v === 1) return (<><path d={`M${cx - 16} 234 C${cx - 18} 217 ${cx + 18} 217 ${cx + 16} 234 C${cx + 8} 226 ${cx - 8} 226 ${cx - 16} 234`} /><circle cx={cx} cy="212" r="7" fill="var(--color-paper)" /><circle cx={cx - 6} cy="237" r="5.5" /><circle cx={cx + 6} cy="237" r="5.5" /><path d={`M${cx - 1} 237 h2`} /></>)
  if (v === 2) return (<><path d={`M${cx - 17} 231 C${cx - 17} 212 ${cx + 17} 212 ${cx + 17} 231 Z`} fill="var(--color-paper)" style={{ stroke: 'var(--color-teal)' }} /><path d={`M${cx + 4} 231 H${cx + 27}`} style={{ stroke: 'var(--color-teal)' }} /></>)
  return (<>{[[-12, 224], [-4, 217], [6, 217], [13, 224], [-17, 234], [17, 234]].map(([dx, y]) => <circle key={dx} cx={cx + dx} cy={y} r="6.5" fill="var(--color-paper)" />)}<path d={`M${cx - 11} 246 Q${cx} 256 ${cx + 11} 246`} /></>)
}

function Person({ cx, v, headRef, nodRef, hot, cheer }) {
  const arm = (s) => `M${cx + s * 34} 288 C${cx + s * 50} 280 ${cx + s * 58} 262 ${cx + s * 54} 244`
  return (
    <g transform="translate(0 -30)">
      <g className={cheer ? 'jump' : undefined}>
        <g className="breathe" style={{ animationDelay: `${(cx % 7) * 0.3}s` }}>
          <path d={`M${cx - 40} ${DESK} C${cx - 43} 300 ${cx - 34} 274 ${cx - 14} 266 L${cx + 14} 266 C${cx + 34} 274 ${cx + 43} 300 ${cx + 40} ${DESK}`} />
          <path d={`M${cx - 14} 268 L${cx} 283 L${cx + 14} 268`} style={{ stroke: v % 2 ? 'var(--color-teal)' : 'var(--color-accent)' }} />
          {/* raised arms: one waves when you hover, both go up when you click */}
          <g className={`arm ${hot || cheer ? 'on' : ''}`} style={{ animation: hot || cheer ? 'wave 0.7s ease-in-out infinite alternate' : undefined }}>
            <path d={arm(1)} fill="none" /><circle cx={cx + 54} cy="241" r="4.5" fill="var(--color-paper)" />
          </g>
          <g className={`arm ${cheer ? 'on' : ''}`} style={{ animation: cheer ? 'wave 0.5s ease-in-out infinite alternate-reverse' : undefined }}>
            <path d={arm(-1)} fill="none" /><circle cx={cx - 54} cy="241" r="4.5" fill="var(--color-paper)" />
          </g>
          <g className="look" ref={headRef}>
            <g ref={nodRef}>
              <path d={`M${cx - 6} 252 V266 M${cx + 6} 252 V266`} />
              <circle cx={cx} cy="236" r="16" fill="var(--color-paper)" />
              <Hair v={v} cx={cx} />
              <circle cx={cx - 5.5} cy="238" r="1.5" fill="var(--color-ink-2)" stroke="none" />
              <circle cx={cx + 5.5} cy="238" r="1.5" fill="var(--color-ink-2)" stroke="none" />
              <path d={cheer ? `M${cx - 5} 243 Q${cx} 250 ${cx + 5} 243 Z` : `M${cx - 4} 244 Q${cx} 247 ${cx + 4} 244`} fill={cheer ? 'var(--color-ink-2)' : 'none'} />
            </g>
          </g>
        </g>
      </g>
    </g>
  )
}

/**
 * The hero scene: a control room standing on the heartbeat line. People at desks look at your pointer, wave when you
 * hover, cheer with a real number when you click, and nod on every new block. Monitors show live numbers, the wall
 * screen shows the real recent blocks, Nyut stands in the middle, and a graph of orange dots lights up per block.
 */
export default function ControlRoom({ main, test, mood }) {
  const nav = useNavigate()
  const box = useRef(null)
  const pathRefs = useRef([])
  const pulseRefs = useRef([])
  const nodeRefs = useRef([])
  const heads = useRef([])
  const nods = useRef([])
  const [size, setSize] = useState(NYUT_W)
  const [hot, setHot] = useState(-1)
  const [cheer, setCheer] = useState(-1)
  const cheerTimer = useRef(0)

  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize((e.contentRect.width * NYUT_W) / W))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  const m = main && !main.loading ? main.metrics : null
  const t = test && !test.loading ? test : null
  const mon = [
    ['Block time', m ? fmtSec(m.avgBlockTime) : '…', '/app?view=mainnet'], ['Gas', m ? fmtGwei(m.gas) : '…', '/app?view=mainnet'],
    ['Tx / block', m ? fmtFixed(m.txPerBlock) : '…', '/app?view=mainnet'], ['Latency', main && !main.loading ? fmtMs(main.latencyMs) : '…', '/app?view=mainnet'],
    ['Testnet RPC', t ? fmtMs(t.latencyMs) : '…', '/app?view=testnet'], ['Addresses', m ? fmtInt(m.activeAddresses) : '…', '/app?view=mainnet'],
    ['Fullness', m ? fmtPct(m.fullness) : '…', '/app?view=mainnet'], ['Contracts', m ? fmtInt(m.newContracts) : '…', '/app?view=mainnet'],
  ]
  // what each person says when clicked: always a number that is on screen right now
  const says = [
    main?.blockNumber != null ? `Block ${fmtInt(main.blockNumber)} is in` : 'Waiting for a block',
    `Gas is ${mon[1][1]}`, `${mon[2][1]} tx per block`, `RPC answers in ${mon[3][1]}`,
  ]

  // every new block: pulses run along the graph, nodes flash on arrival, and everyone nods
  useEffect(() => {
    if (!main?.newBlockAt || reduced()) return
    EDGES.forEach((e, i) => {
      const path = pathRefs.current[i], dot = pulseRefs.current[i], node = nodeRefs.current[e.to]
      if (!path || !dot) return
      const len = path.getTotalLength(), o = { t: 0 }
      gsap.to(o, {
        t: 1, duration: 0.7, delay: e.wave * 0.7, ease: 'power1.inOut',
        onStart: () => { dot.style.opacity = 1 },
        onUpdate: () => { const p = path.getPointAtLength(o.t * len); dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y) },
        onComplete: () => { dot.style.opacity = 0; if (node) gsap.fromTo(node, { attr: { r: 9 } }, { attr: { r: 5 }, duration: 0.6, ease: 'power2.out' }) },
      })
    })
    nods.current.forEach((el, i) => el?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 520, delay: 500 + i * 140, easing: 'ease-in-out' }))
  }, [main?.newBlockAt])

  // heads follow the pointer, the station under it gets hot
  const onMove = (e) => {
    const r = box.current.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H
    STATIONS.forEach((cx, i) => {
      const dx = Math.max(-1, Math.min(1, (px - cx) / 240)), dy = Math.max(-1, Math.min(1, (py - 206) / 160))
      if (heads.current[i]) heads.current[i].style.transform = `rotate(${(dx * LOOK).toFixed(1)}deg) translate(${(dx * 2).toFixed(1)}px, ${(dy * 1.5).toFixed(1)}px)`
    })
    const h = STATIONS.findIndex((cx) => Math.abs(px - cx) < 112 && py > 170 && py < FLOOR)
    setHot((p) => (p === h ? p : h))
  }
  const onLeave = () => { heads.current.forEach((el) => { if (el) el.style.transform = '' }); setHot(-1) }
  const hail = (i) => {
    setCheer(i); clearTimeout(cheerTimer.current); cheerTimer.current = setTimeout(() => setCheer(-1), 2400)
    const node = nodeRefs.current[i]; if (node && !reduced()) gsap.fromTo(node, { attr: { r: 12 } }, { attr: { r: 5 }, duration: 0.8, ease: 'power2.out' })
  }
  useEffect(() => () => clearTimeout(cheerTimer.current), [])

  const line = { fill: 'none', stroke: 'var(--color-ink-2)', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const bubbleW = (s) => Math.max(90, s.length * 7.4 + 22)

  return (
    <div ref={box} className="relative mx-auto w-full max-w-[1200px]" style={{ aspectRatio: `${W} / ${H}` }} onPointerMove={onMove} onPointerLeave={onLeave}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" role="group" aria-label="A control room built on a heartbeat line. People at desks watch live BOT Chain numbers; a wall screen shows the latest blocks. Click a person to hear a number.">
        <defs>
          <filter id="rough" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" /></filter>
        </defs>

        {/* the floor is the heartbeat, drawn as heavy as Nyut's own outline so the two read as one line */}
        <g fill="none" stroke="var(--color-teal)" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round"><path d={FLOOR_L} /><path d={FLOOR_R} /></g>

        {/* sketch layer: lamps, wall screen frame, desks, people */}
        <g {...line} filter="url(#rough)">
          {[300, 600, 900].map((x) => <g key={x}><path d={`M${x} 0 V16`} /><path d={`M${x - 16} 34 L${x - 8} 16 H${x + 8} L${x + 16} 34 Z`} /></g>)}
          <rect x={WALL.x} y={WALL.y} width={WALL.w} height={WALL.h} rx="8" fill="var(--color-paper)" />
          <path d={`M${WALL.x + 40} ${WALL.y + WALL.h} V${WALL.y + WALL.h + 10} M${WALL.x + WALL.w - 40} ${WALL.y + WALL.h} V${WALL.y + WALL.h + 10}`} />
          {STATIONS.map((cx, i) => (
            <g key={cx}>
              <rect x={cx - 112} y={DESK} width="224" height="8" rx="3" fill="var(--color-paper)" />
              <path d={`M${cx - 96} ${DESK + 8} V${FLOOR} M${cx + 96} ${DESK + 8} V${FLOOR}`} />
              <Person cx={cx} v={i} hot={hot === i} cheer={cheer === i} headRef={(el) => (heads.current[i] = el)} nodRef={(el) => (nods.current[i] = el)} />
              <path d={`M${cx + 82} ${DESK - 2} v-12 h12 v12`} />{/* a mug */}
            </g>
          ))}
        </g>

        {/* click targets over the people (above the sketch, below the monitors) */}
        {STATIONS.map((cx, i) => (
          <rect key={cx} x={cx - 64} y={170} width="128" height="114" fill="transparent" style={{ cursor: 'pointer' }} role="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()}
            aria-label={`${says[i]}. Click for a cheer`} onClick={() => hail(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hail(i) } }} />
        ))}

        {/* monitors with live numbers; each one is a link to the dashboard */}
        {STATIONS.flatMap((cx, i) => [0, 1].map((k) => {
          const [label, value, to] = mon[i * 2 + k], x = k ? cx + 4 : cx - 100
          return (
            <g key={`${cx}-${k}`} className="mon" role="link" tabIndex={0} onMouseDown={(e) => e.preventDefault()} aria-label={`${label}, ${value}. Open the dashboard`} onClick={() => nav(to)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(to) } }}>
              <rect className="screen" x={x} y={284} width="96" height="44" rx="5" fill="var(--color-paper-2)" stroke="var(--color-ink-2)" strokeWidth="1.7" />
              <text x={x + 9} y={299} className="fill-muted" style={{ font: '400 12px var(--font-body)' }}>{label}</text>
              <text x={x + 9} y={319} className="fill-ink" style={{ font: '500 13px var(--font-outlier)' }}>{value}</text>
            </g>
          )
        }))}

        {/* wall screen caption: the network and the newest block, live */}
        <text x={WALL.x + 12} y={WALL.y + WALL.h - 10} className="fill-muted" style={{ font: '400 12px var(--font-body)' }}>Mainnet</text>
        <text x={WALL.x + WALL.w - 12} y={WALL.y + WALL.h - 10} textAnchor="end" className="fill-ink" style={{ font: '500 13px var(--font-outlier)' }}>{main?.blockNumber != null ? `#${fmtInt(main.blockNumber)}` : '…'}</text>

        {/* the graph: edges from the wall screen to a node over each head and over Nyut, a pulse per block */}
        {EDGES.map((e, i) => <path key={i} ref={(el) => (pathRefs.current[i] = el)} d={edgePath(e)} className="flow-line" />)}
        {NODES.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="11" className="node-halo" style={{ fill: 'var(--color-accent)', animationDelay: `${i * 0.5}s` }} />
            <circle ref={(el) => (nodeRefs.current[i] = el)} cx={n.x} cy={n.y} r="5" style={{ fill: 'var(--color-accent)' }} />
          </g>
        ))}
        {[[WALL.x, 124], [WALL.x + WALL.w, 124], [600, WALL.y + WALL.h]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" style={{ fill: 'var(--color-accent)' }} />)}
        {EDGES.map((_, i) => <circle key={'p' + i} ref={(el) => (pulseRefs.current[i] = el)} r="5" cx="-20" cy="-20" opacity="0" style={{ fill: 'var(--color-teal)' }} />)}

        {/* a person's line after a click */}
        {cheer >= 0 && (() => {
          const cx = STATIONS[cheer], s = says[cheer], w = bubbleW(s)
          return (
            <g className="bubble" pointerEvents="none">
              <rect x={cx - w / 2} y={146} width={w} height="26" rx="13" fill="var(--color-paper-2)" stroke="var(--color-accent)" strokeWidth="1.5" />
              <path d={`M${cx - 5} 172 L${cx} 179 L${cx + 5} 172`} fill="var(--color-paper-2)" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinejoin="round" />
              <path d={`M${cx - 4} 171.2 H${cx + 4}`} stroke="var(--color-paper-2)" strokeWidth="3" />
              <text x={cx} y={163.5} textAnchor="middle" className="fill-ink" style={{ font: '500 12px var(--font-outlier)' }}>{s}</text>
            </g>
          )
        })()}
      </svg>

      {/* real recent blocks on the wall screen */}
      <div className="absolute" style={{ left: `${((WALL.x + 8) / W) * 100}%`, top: `${((WALL.y + 8) / H) * 100}%`, width: `${((WALL.w - 16) / W) * 100}%`, height: `${((WALL.h - 40) / H) * 100}%` }}>
        <BlockNetwork recent={main?.recent} height="100%" explorer={NETWORKS.mainnet.explorer} />
      </div>

      {/* Nyut stands in the middle; its ground line sits exactly on the floor. Only the body takes the pointer. */}
      <div className="pointer-events-none absolute" style={{ left: `${(NYUT_LEFT / W) * 100}%`, width: `${(NYUT_W / W) * 100}%`, top: `${((FLOOR - NYUT_W * 0.67) / H) * 100}%` }}>
        <Beat tight mood={mood} pulseKey={main?.newBlockAt || 0} size={size} />
      </div>
    </div>
  )
}
