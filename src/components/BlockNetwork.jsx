import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtInt } from '../lib/format.js'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
// a stable pseudo-random 0..1 from a block number, so a block keeps its place while the window slides
const hash = (n) => { let x = Math.imul(n, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; return (x % 1000) / 1000 }
const HIT = 22 // px: how close the pointer must be to a dot to pick it

/**
 * The last blocks as a network of glowing orange dots (the V7 hero effect, made of real data).
 * One dot per block, bigger and brighter when it carried transactions. Hover or arrow-key to read a block,
 * click, tap or Enter to open it on the explorer. Dots near the pointer light up. A hidden list mirrors the
 * dots for screen readers.
 */
export default function BlockNetwork({ recent = [], height = 200, explorer }) {
  const wrap = useRef(null)
  const ref = useRef(null)
  const st = useRef({ recent: [], shift: 0, pulseAt: -1e9, newest: null, pts: [], pointer: null, hover: null, sel: null })
  const [tip, setTip] = useState(null) // { i, x, y }

  const open = useCallback((i) => {
    const b = st.current.recent[i]
    if (b && explorer) window.open(`${explorer}/block/${b.n}`, '_blank', 'noopener')
  }, [explorer])

  // a new newest block: slide the field by the number of blocks that arrived, and ring the newest dot
  useEffect(() => {
    const s = st.current, newest = recent.length ? recent[recent.length - 1].n : null
    if (s.newest != null && newest != null && newest > s.newest) {
      const d = Math.min(newest - s.newest, 6)
      s.shift += d
      s.pulseAt = performance.now()
      // keep the pinned dot on the same block while the window slides
      if (s.sel != null) s.sel = Math.max(0, s.sel - d)
    }
    s.newest = newest
    s.recent = recent
  }, [recent])

  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d')
    const css = getComputedStyle(document.documentElement)
    const accent = css.getPropertyValue('--color-accent').trim(), muted = css.getPropertyValue('--color-muted').trim(), ink = css.getPropertyValue('--color-ink').trim()
    let w = 0, h = 0, raf, running = false

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      w = c.clientWidth; h = c.clientHeight
      c.width = w * dpr; c.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(performance.now())
    }

    const draw = (now) => {
      const s = st.current, n = s.recent.length
      ctx.clearRect(0, 0, w, h)
      if (n < 2) return
      s.shift *= 0.9; if (s.shift < 0.004) s.shift = 0
      const pad = 24, step = (w - pad * 2) / (n - 1)
      const pts = s.recent.map((b, i) => ({
        x: pad + (i + s.shift) * step,
        y: Math.min(h - 18, Math.max(18, h * 0.5 + Math.sin(b.n * 0.9) * h * 0.18 + (hash(b.n) - 0.5) * h * 0.4)),
        tx: b.tx, k: hash(b.n + 7),
      }))
      s.pts = pts
      const focus = s.hover ?? s.sel
      ctx.lineWidth = 1
      for (let i = 0; i < n - 1; i++) {
        const lit = focus != null && (i === focus || i + 1 === focus)
        ctx.globalAlpha = lit ? 0.9 : 0.45; ctx.strokeStyle = lit ? accent : muted
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke()
        if (pts[i].k > 0.62 && i + 3 < n) { ctx.globalAlpha = 0.2; ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 3].x, pts[i + 3].y); ctx.stroke() }
      }
      ctx.fillStyle = accent; ctx.shadowColor = accent
      pts.forEach((p, i) => {
        const near = s.pointer ? Math.max(0, 1 - Math.hypot(p.x - s.pointer.x, p.y - s.pointer.y) / 120) : 0
        const r = 2.2 + Math.min(4.5, p.tx * 1.1) + near * 2.4, newest = i === n - 1
        ctx.globalAlpha = Math.min(1, (0.5 + p.tx * 0.16 + near * 0.4) * (0.4 + 0.6 * (i / (n - 1))))
        ctx.shadowBlur = 8 + Math.min(12, p.tx * 3) + near * 14 + (newest ? 6 : 0)
        ctx.beginPath(); ctx.arc(p.x, p.y, newest ? r + 1.5 : r, 0, Math.PI * 2); ctx.fill()
      })
      ctx.shadowBlur = 0
      const t = (now - s.pulseAt) / 1400
      if (t >= 0 && t < 1) {
        const p = pts[n - 1]
        ctx.globalAlpha = 0.6 * (1 - t); ctx.strokeStyle = accent; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(p.x, p.y, 8 + t * 22, 0, Math.PI * 2); ctx.stroke()
      }
      if (focus != null && pts[focus]) {
        const p = pts[focus]
        ctx.globalAlpha = 1; ctx.strokeStyle = ink; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(p.x, p.y, 10 + Math.min(4.5, p.tx * 1.1), 0, Math.PI * 2); ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const tick = (now) => { draw(now); raf = requestAnimationFrame(tick) }
    const redraw = () => { if (!running) draw(performance.now()) } // reduced motion has no loop, so repaint on interaction

    const pick = (e) => {
      const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, s = st.current
      s.pointer = { x, y }
      let best = null, d = HIT
      s.pts.forEach((p, i) => { const k = Math.hypot(p.x - x, p.y - y); if (k < d) { d = k; best = i } })
      if (best !== s.hover) {
        s.hover = best
        setTip(best == null ? null : { i: best, x: s.pts[best].x, y: s.pts[best].y })
        c.style.cursor = best == null ? 'default' : 'pointer'
      }
      redraw()
    }
    const leave = () => { const s = st.current; s.pointer = null; s.hover = null; setTip(s.sel != null && s.pts[s.sel] ? { i: s.sel, x: s.pts[s.sel].x, y: s.pts[s.sel].y } : null); c.style.cursor = 'default'; redraw() }
    const click = (e) => { pick(e); const s = st.current; if (s.hover != null) open(s.hover) }
    c.addEventListener('pointermove', pick); c.addEventListener('pointerleave', leave); c.addEventListener('click', click)

    const ro = new ResizeObserver(resize)
    ro.observe(c)
    resize()
    let io
    if (!reduced()) {
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(tick) }
        if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf) }
      })
      io.observe(c)
    }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io?.disconnect(); c.removeEventListener('pointermove', pick); c.removeEventListener('pointerleave', leave); c.removeEventListener('click', click) }
  }, [open])

  // keyboard: arrows move between blocks, Home and End jump to the ends, Enter opens, Escape lets go
  const onKey = (e) => {
    const s = st.current, n = s.recent.length
    if (!n) return
    const move = (i) => { s.sel = Math.max(0, Math.min(n - 1, i)); const p = s.pts[s.sel]; if (p) setTip({ i: s.sel, x: p.x, y: p.y }); e.preventDefault() }
    if (e.key === 'ArrowRight') move((s.sel ?? n - 2) + 1)
    else if (e.key === 'ArrowLeft') move((s.sel ?? n) - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(n - 1)
    else if ((e.key === 'Enter' || e.key === ' ') && s.sel != null) { open(s.sel); e.preventDefault() }
    else if (e.key === 'Escape') { s.sel = null; setTip(null) }
  }

  const b = tip ? recent[tip.i] : null
  const newest = recent.length ? recent[recent.length - 1].n : null
  const behind = b && newest != null ? newest - b.n : 0
  return (
    <div ref={wrap} className="relative" tabIndex={0} role="group" aria-label="Recent blocks. Use the arrow keys to read a block and Enter to open it on the explorer." onKeyDown={onKey}
      onBlur={() => { st.current.sel = null; if (!st.current.hover) setTip(null) }}>
      <canvas ref={ref} style={{ width: '100%', height, touchAction: 'pan-y' }} aria-hidden />
      {b && (
        <div className="pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-rule bg-paper2 px-3 py-2 text-left shadow-lg"
          style={{ left: Math.max(100, Math.min((wrap.current?.clientWidth || 600) - 100, tip.x)), top: Math.max(0, tip.y - 76) }}>
          <p className="num text-sm text-ink">#{fmtInt(b.n)}</p>
          <p className="text-xs text-ink2">{b.tx === 0 ? 'No transactions' : `${b.tx} transaction${b.tx === 1 ? '' : 's'}`}</p>
          <p className="text-xs text-muted">{behind === 0 ? 'Newest block' : `${behind} block${behind === 1 ? '' : 's'} before the newest`}</p>
        </div>
      )}
      <ul className="visually-hidden">
        {recent.slice().reverse().map((x) => <li key={x.n}>Block {fmtInt(x.n)}, {x.tx} transactions</li>)}
      </ul>
    </div>
  )
}
