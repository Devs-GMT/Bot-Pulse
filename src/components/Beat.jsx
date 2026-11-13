import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/*
* Nyut is the BOT Pulse mascot: the R wave of a heartbeat with a face. One teal line runs along the ground, climbs over the peak
 * as its outline and runs on; coral fills the inside. The body's height follows the mood.
 * Moods: pulse | sleep | sweat | cheer | down.
 */
const YB = 232
const HEIGHT = { pulse: 150, sleep: 58, sweat: 140, cheer: 164, down: 96 }
const TY0 = YB - HEIGHT.pulse // apex of the geometry every overlay is drawn at
const EY0 = YB - HEIGHT.pulse * 0.56 // eye line of that geometry

const dome = (h) => `M96 ${YB} C150 ${YB} 158 ${YB - h} 200 ${YB - h} C242 ${YB - h} 250 ${YB} 304 ${YB}`
const geo = (h) => ({ ty: YB - h, ey: YB - Math.max(36, h * 0.56) })
// a point on the outline at parameter t (right side); the left side is its mirror
const outlinePoint = (h, t) => {
  const ty = YB - h, u = 1 - t
  return [u ** 3 * 200 + 3 * u * u * t * 242 + 3 * u * t * t * 250 + t ** 3 * 304, (u ** 3 + 3 * u * u * t) * ty + (3 * u * t * t + t ** 3) * YB]
}

const TAILS = {
  normal: ['M0 232 H36 C42 232 44 220 52 220 C60 220 62 232 68 232 H84 L89 237 L96 232', 'M304 232 L311 245 L319 232 H334 C344 232 348 210 360 210 C372 210 376 232 386 232 H400'],
  sweat: ['M0 232 H26 L38 206 L50 256 L62 204 L74 254 L86 222 L96 232', 'M304 232 H312 L324 208 L336 258 L348 206 L360 254 L372 224 L384 232 H400'],
  flat: ['M0 232 H96', 'M304 232 H400'],
  down: ['M0 232 H96', 'M304 232 H326'],
}
const SHOW = {
  pulse: ['eyes', 'mEcg', 'tNormal', 'crownA'],
  sleep: ['eyesClosed', 'mFlat', 'tFlat', 'zzz'],
  sweat: ['eyesWide', 'mJag', 'tSweat', 'crownB', 'drops'],
  cheer: ['eyesHappy', 'mOpen', 'tNormal', 'crownC', 'arms', 'sparks'],
  down: ['eyesX', 'mDown', 'tDown', 'breakDash', 'breakSpark'],
}
const MANAGED = new Set(Object.values(SHOW).flat())
const DIM = new Set(['sleep', 'down'])
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const cv = (name) => `var(--color-${name})`
const BODY = cv('accent')
const BODY_DIM = 'color-mix(in oklab, var(--color-accent) 68%, black)'
const LINE = cv('teal')
const LINE_DIM = 'color-mix(in oklab, var(--color-teal) 55%, black)'
const WATER = 'color-mix(in oklab, var(--color-teal) 55%, white)'
const sk = { strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }

const crownArc = (r, a0 = -128, a1 = -52) => {
  const p = (a) => `${(200 + r * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(TY0 + 10 + r * Math.sin((a * Math.PI) / 180)).toFixed(1)}`
  return `M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}`
}

/**
 * `mood` picks the pose. `pulseKey` changes on every new block and sends a ripple through the peak.
 * Interactive: eyes follow the pointer, it blinks, hover perks it up, click, Enter or Space boops it.
 */
export default function Beat({ mood = 'pulse', pulseKey = 0, size = 220, onBoop, tight = false, className = '' }) {
  const root = useRef(null)
  const r = useRef({})
  const hRef = useRef(HEIGHT[mood])
  const lastPulse = useRef(pulseKey)
  const init = useRef(HEIGHT[mood])
  const idle = useRef({ n: 0, last: '', tl: null, lastMove: 0, at: 0 })

  const q = (k) => root.current?.querySelectorAll('[data-k="' + k + '"]') || []
  const setAttr = (el, a, v) => el && el.setAttribute(a, v)

  // Small idle gestures, only in pulse and tied to the live chain: one every third block, or about every 12 s if
  // blocks stall. They stop the instant the live mood changes, so the live state always wins.
  const runGesture = () => {
    const el = root.current, st = idle.current
    if (!el || reduced() || document.hidden || Date.now() - st.at < 4000) return
    const inner = r.current.inner, pupils = el.querySelectorAll('[data-pupil]')
    const d = Math.random() < 0.5 ? -1 : 1
    const kinds = {
      tilt: () => gsap.timeline().to(inner, { rotation: 5 * d, svgOrigin: '200 232', duration: 0.5, ease: 'sine.inOut' }).to(inner, { rotation: 0, duration: 0.7, ease: 'sine.inOut' }, '+=0.45'),
      hop: () => gsap.timeline().to(inner, { y: -14, duration: 0.22, ease: 'power2.out' }).to(inner, { y: 0, duration: 0.45, ease: 'bounce.out' }),
      look: () => gsap.timeline().to(pupils, { x: 5 * d, duration: 0.3, ease: 'power2.out', overwrite: 'auto' }).to(pupils, { x: -5 * d, duration: 0.5, ease: 'sine.inOut' }, '+=0.5').to(pupils, { x: 0, duration: 0.3 }, '+=0.4'),
      smile: () => gsap.timeline().to(q('eyes'), { autoAlpha: 0, duration: 0.12 }).to(q('eyesHappy'), { autoAlpha: 1, duration: 0.12 }, '<').to(q('eyesHappy'), { autoAlpha: 0, duration: 0.15 }, '+=0.9').to(q('eyes'), { autoAlpha: 1, duration: 0.15 }, '<'),
      wiggle: () => gsap.timeline().to(q('crownA'), { x: 3, duration: 0.07, repeat: 5, yoyo: true }).to(q('crownA'), { x: 0, duration: 0.07 }),
    }
    // do not look around while the pointer is steering the eyes, and never repeat the last gesture
    const pointerBusy = Date.now() - st.lastMove < 3000
    const pool = Object.keys(kinds).filter((k) => k !== st.last && !(k === 'look' && pointerBusy))
    const pick = pool[Math.floor(Math.random() * pool.length)]
    st.tl?.kill()
    st.at = Date.now()
    st.last = pick
    st.tl = kinds[pick]()
  }

  // everything that depends on the body's height
  const apply = (h) => {
    const { ty, ey } = geo(h)
    const { fill, outline, face, crown, extras, armL, armR, handL, handR } = r.current
    setAttr(fill, 'd', dome(h) + ' Z')
    setAttr(outline, 'd', dome(h))
    setAttr(face, 'transform', `translate(0 ${(ey - EY0).toFixed(1)})`)
    setAttr(crown, 'transform', `translate(0 ${(ty - TY0).toFixed(1)})`)
    setAttr(extras, 'transform', `translate(0 ${(ty - TY0).toFixed(1)})`)
    const [ax, ay] = outlinePoint(h, 0.6)
    setAttr(armR, 'd', `M${ax.toFixed(1)} ${ay.toFixed(1)} L${(ax + 40).toFixed(1)} ${(ay - 58).toFixed(1)}`)
    setAttr(armL, 'd', `M${(400 - ax).toFixed(1)} ${ay.toFixed(1)} L${(360 - ax).toFixed(1)} ${(ay - 58).toFixed(1)}`)
    setAttr(handR, 'cx', (ax + 44).toFixed(1)); setAttr(handR, 'cy', (ay - 65).toFixed(1))
    setAttr(handL, 'cx', (356 - ax).toFixed(1)); setAttr(handL, 'cy', (ay - 65).toFixed(1))
  }

  // the pose for this mood: which parts show, how tall the body is
  useEffect(() => {
    const el = root.current
    if (!el) return
    el.querySelectorAll('[data-k]').forEach((n) => {
      if (!MANAGED.has(n.dataset.k)) return
      gsap.to(n, { autoAlpha: SHOW[mood].includes(n.dataset.k) ? 1 : 0, duration: 0.25, overwrite: 'auto' })
    })
    const target = HEIGHT[mood], proxy = { h: hRef.current }
    if (reduced()) { hRef.current = target; apply(target); return }
    const t = gsap.to(proxy, { h: target, duration: 0.7, ease: 'elastic.out(1, 0.55)', onUpdate: () => { hRef.current = proxy.h; apply(proxy.h) } })
    return () => t.kill()
  }, [mood])

  // the loop each mood keeps playing
  useEffect(() => {
    const el = root.current
    if (!el || reduced()) return
    const inner = r.current.inner
    const ctx = gsap.context(() => {
      if (mood === 'pulse') gsap.to(inner, { scaleY: 1.025, svgOrigin: '200 232', duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      if (mood === 'sleep') {
        gsap.to(inner, { scaleY: 1.05, svgOrigin: '200 232', duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
        gsap.fromTo(q('zzz'), { y: 0 }, { y: -10, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      }
      if (mood === 'sweat') {
        gsap.to(inner, { x: 2.5, duration: 0.07, yoyo: true, repeat: -1 })
        gsap.fromTo(q('drops'), { y: 0 }, { y: 28, duration: 1, repeat: -1, ease: 'power1.in' })
      }
      if (mood === 'cheer') {
        gsap.fromTo(inner, { y: 0 }, { y: -20, duration: 0.28, yoyo: true, repeat: 7, ease: 'power2.out' })
        gsap.fromTo(q('crownC'), { opacity: 0.6 }, { opacity: 1, duration: 0.45, yoyo: true, repeat: -1, stagger: 0.12 })
        gsap.fromTo(q('sparks'), { scale: 0.8, svgOrigin: '200 70' }, { scale: 1.1, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      }
      if (mood === 'down') {
        gsap.to(inner, { opacity: 0.72, duration: 0.18, yoyo: true, repeat: -1, repeatDelay: 1.1, ease: 'steps(2)' })
        gsap.fromTo(q('breakSpark'), { opacity: 1 }, { opacity: 0.15, duration: 0.25, yoyo: true, repeat: -1, repeatDelay: 0.6 })
      }
    }, el)
    return () => ctx.revert()
  }, [mood])

  // a new block: a ripple through the crown and a small bounce
  useEffect(() => {
    if (pulseKey === lastPulse.current) return
    lastPulse.current = pulseKey
    const el = root.current
    if (!el || reduced() || mood !== 'pulse') return
    gsap.fromTo(q('crownA'), { opacity: 0.2, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(3)' })
    gsap.fromTo(r.current.inner, { scaleY: 1.07, svgOrigin: '200 232' }, { scaleY: 1, duration: 0.5, ease: 'back.out(3)' })
    idle.current.n += 1
    if (idle.current.n % 3 === 0) runGesture()
  }, [pulseKey, mood])

  // idle fallback when blocks stall, and a clean stop the moment the mood changes
  useEffect(() => {
    const st = idle.current
    const t = setInterval(() => { if (mood === 'pulse' && Date.now() - st.at > 11000) runGesture() }, 4000)
    return () => {
      clearInterval(t)
      st.tl?.kill()
      if (r.current.inner) gsap.set(r.current.inner, { rotation: 0, y: 0 })
      if (root.current) gsap.set(root.current.querySelectorAll('[data-k="crownA"]'), { x: 0 })
    }
  }, [mood])

  // pupils follow the pointer, eyes blink now and then
  useEffect(() => {
    const el = root.current
    if (!el || reduced()) return
    const pupils = el.querySelectorAll('[data-pupil]')
    const move = (e) => {
      idle.current.lastMove = Date.now()
      const b = el.getBoundingClientRect()
      const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height * 0.5)
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 240) * 6
      gsap.to(pupils, { x: (dx / d) * k, y: (dy / d) * k, duration: 0.25, overwrite: 'auto' })
    }
    window.addEventListener('pointermove', move)
    let call
    const blink = () => {
      // a blink shrinks the eyes' height (no transform, so nothing can slide off the face)
      gsap.to(el.querySelectorAll('[data-lid]'), { attr: { ry: 0.8 }, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut' })
      call = gsap.delayedCall(2.5 + Math.random() * 3, blink)
    }
    call = gsap.delayedCall(2, blink)
    return () => { window.removeEventListener('pointermove', move); call.kill() }
  }, [])

  function boop() {
    const inner = r.current.inner
    if (inner && !reduced()) gsap.fromTo(inner, { scaleX: 1.1, scaleY: 0.88, svgOrigin: '200 232' }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)', overwrite: 'auto' })
    onBoop?.()
  }
  const perk = (on) => { if (!reduced() && mood === 'pulse') gsap.to(q('crownA'), { y: on ? -5 : 0, duration: 0.25, ease: 'power2.out' }) }

  const dimmed = DIM.has(mood)
  const line = dimmed ? LINE_DIM : LINE
  const body = dimmed ? BODY_DIM : BODY
  const t = { transition: 'stroke 0.3s, fill 0.3s' }
  const arc = (rad, w, op) => <path d={crownArc(rad)} strokeWidth={w} style={{ ...sk, stroke: line, opacity: op }} />
  const stick = (d) => <path key={d} d={d} strokeWidth="6" style={{ ...sk, stroke: line }} />
  const ink = { stroke: cv('paper') }
  const eye = (x, rr) => (
    <g>
      <ellipse data-lid cx={x} cy="148" rx={rr} ry={rr} style={{ fill: cv('ink') }} />
      <ellipse data-pupil data-lid cx={x + 1} cy="149" rx={rr * 0.48} ry={rr * 0.48} style={{ fill: cv('paper') }} />
    </g>
  )
  const cross = (x) => <path d={`M${x - 8} 140 L${x + 8} 156 M${x + 8} 140 L${x - 8} 156`} strokeWidth="4.5" style={{ ...sk, ...ink }} />
  const spark = (x, y, s, c) => <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -14 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" style={{ fill: c }} />
  const hidden = { opacity: 0, visibility: 'hidden' }
  const [ax, ay] = outlinePoint(init.current, 0.6)

  return (
    <svg
      ref={root}
      viewBox="0 -36 400 336"
      width={size}
      height={size * 0.84}
      className={`cursor-pointer select-none outline-none focus-visible:[filter:drop-shadow(0_0_5px_var(--color-focus))] ${className}`}
      style={tight ? { pointerEvents: 'none' } : undefined}
      onMouseDown={(e) => e.preventDefault()}
      role="button"
      tabIndex={0}
      aria-label={`Nyut, the BOT Pulse mascot, feeling ${mood}. Press to boop.`}
      onClick={boop}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); boop() } }}
      onPointerEnter={() => perk(true)}
      onPointerLeave={() => perk(false)}
    >
      <g ref={(n) => (r.current.inner = n)}>
        {/* the ground line, which changes shape with the mood */}
        {Object.entries(TAILS).map(([k, [a, b]]) => (
          <g key={k} data-k={'t' + k[0].toUpperCase() + k.slice(1)} style={hidden}>
            <path d={a} strokeWidth="9" style={{ ...sk, stroke: line, ...t }} />
            <path d={b} strokeWidth="9" style={{ ...sk, stroke: line, ...t }} />
          </g>
        ))}
        <g data-k="breakDash" style={hidden}><path d="M348 232 H400" strokeWidth="5" strokeDasharray="3 9" style={{ ...sk, stroke: cv('rule') }} /></g>

        <path ref={(n) => (r.current.fill = n)} d={dome(init.current) + ' Z'} style={{ fill: body, ...t, pointerEvents: 'all' }} />
        <path ref={(n) => (r.current.outline = n)} d={dome(init.current)} strokeWidth="9" style={{ ...sk, stroke: line, ...t }} />

        {/* arms leave the outline when cheering */}
        <g data-k="arms" style={hidden}>
          <path ref={(n) => (r.current.armR = n)} d={`M${ax} ${ay} L${ax + 40} ${ay - 58}`} strokeWidth="9" style={{ ...sk, stroke: line }} />
          <path ref={(n) => (r.current.armL = n)} d={`M${400 - ax} ${ay} L${360 - ax} ${ay - 58}`} strokeWidth="9" style={{ ...sk, stroke: line }} />
          <circle ref={(n) => (r.current.handR = n)} cx={ax + 44} cy={ay - 65} r="12" style={{ fill: line }} />
          <circle ref={(n) => (r.current.handL = n)} cx={356 - ax} cy={ay - 65} r="12" style={{ fill: line }} />
        </g>

        {/* crown: pulse sticks, sweat sticks (jittery), cheer broadcast arcs */}
        <g ref={(n) => (r.current.crown = n)}>
          <g data-k="crownA" style={hidden}>{['M200 68 L200 50', 'M187 73 L177 59', 'M213 73 L223 59'].map(stick)}</g>
          <g data-k="crownB" style={hidden}>{['M200 68 L197 50', 'M188 74 L176 62', 'M212 74 L226 64'].map(stick)}</g>
          <g data-k="crownC" style={hidden}>{arc(30, 7, 1)}{arc(48, 6, 0.65)}{arc(66, 5, 0.35)}</g>
        </g>

        {/* face */}
        <g ref={(n) => (r.current.face = n)}>
          <g data-k="eyes">{eye(184, 10)}{eye(216, 10)}</g>
          <g data-k="eyesWide" style={hidden}>{eye(184, 12)}{eye(216, 12)}</g>
          <g data-k="eyesClosed" style={hidden}>
            <path d="M175 148 Q184 157 193 148" strokeWidth="4" style={{ ...sk, ...ink }} /><path d="M207 148 Q216 157 225 148" strokeWidth="4" style={{ ...sk, ...ink }} />
          </g>
          <g data-k="eyesHappy" style={hidden}>
            <path d="M175 151 Q184 139 193 151" strokeWidth="4" style={{ ...sk, ...ink }} /><path d="M207 151 Q216 139 225 151" strokeWidth="4" style={{ ...sk, ...ink }} />
          </g>
          <g data-k="eyesX" style={hidden}>{cross(184)}{cross(216)}</g>
          <path data-k="mEcg" d="M186 176 H193 L197 168 L202 184 L207 176 H214" strokeWidth="4" style={{ ...sk, ...ink }} />
          <path data-k="mFlat" d="M190 172 H210" strokeWidth="4" style={{ ...sk, ...ink, ...hidden }} />
          <path data-k="mJag" d="M184 176 L190 170 L196 182 L202 170 L208 182 L214 172" strokeWidth="4" style={{ ...sk, ...ink, ...hidden }} />
          <path data-k="mOpen" d="M184 170 Q200 198 216 170 Z" style={{ fill: cv('paper'), ...hidden }} />
          <path data-k="mDown" d="M188 180 Q200 170 212 180" strokeWidth="4" style={{ ...sk, ...ink, ...hidden }} />
        </g>

        {/* things around it */}
        <g ref={(n) => (r.current.extras = n)}>
          <g data-k="zzz" style={hidden}>
            <text x="266" y="166" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="30" style={{ fill: cv('muted') }}>z</text>
            <text x="292" y="140" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="22" style={{ fill: cv('muted') }}>z</text>
          </g>
          <g data-k="drops" style={hidden}><path d="M268 80 c-9 16 -10 26 0 29 c10 -3 9 -13 0 -29z" style={{ fill: WATER }} /></g>
          <g data-k="sparks" style={hidden}>
            {spark(112, 70, 0.85, cv('teal'))}{spark(288, 70, 0.85, cv('teal'))}{spark(200, 14, 1, cv('amber'))}
            <circle cx="96" cy="120" r="4" style={{ fill: cv('amber') }} /><circle cx="306" cy="112" r="4" style={{ fill: cv('amber') }} />
          </g>
        </g>
        <g data-k="breakSpark" style={hidden}>{spark(337, 210, 0.9, cv('amber'))}</g>
      </g>
    </svg>
  )
}
