import { useEffect, useRef } from 'react'

// one heartbeat (P wave, QRS, T wave), normalised amplitude
const BEAT = [0, 0.08, 0.14, 0.08, 0, 0, 0, -0.1, -0.25, 0.2, 1, 0.4, -0.45, -0.2, 0, 0, 0.1, 0.22, 0.26, 0.2, 0.1, 0]
const STEP = 2 // px per sample, one sample per frame (~120 px/s)

/**
 * Hospital-monitor ECG trace on a canvas. Every change of `pulseKey` (a new mainnet block) queues a heartbeat;
 * if no block arrives the line goes flat, which is the honest picture of a stalled chain.
 */
export default function EcgMonitor({ pulseKey = 0, height = 130 }) {
  const ref = useRef(null)
  const queued = useRef(0)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    queued.current = Math.min(queued.current + 1, 2)
  }, [pulseKey])

  useEffect(() => {
    const c = ref.current
    const ctx = c.getContext('2d')
    const css = getComputedStyle(document.documentElement)
    const color = css.getPropertyValue('--color-teal').trim() || 'currentColor'
    const gridColor = css.getPropertyValue('--color-rule').trim() || 'currentColor'
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let samples = [], raf, running = false, pending = [], w = 0, h = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      w = c.clientWidth; h = c.clientHeight
      c.width = w * dpr; c.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      samples = new Array(Math.ceil(w / STEP) + 2).fill(0)
      draw()
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      // faint monitor grid
      ctx.strokeStyle = gridColor; ctx.lineWidth = 1
      for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
      const amp = h * 0.36, mid = h / 2
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      ctx.shadowColor = color; ctx.shadowBlur = 12
      ctx.strokeStyle = color; ctx.lineWidth = 2.2
      ctx.beginPath()
      samples.forEach((v, i) => { const x = w - (samples.length - 1 - i) * STEP, y = mid - v * amp; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
      ctx.stroke()
      ctx.shadowBlur = 0
      // bright head
      const head = samples[samples.length - 1]
      ctx.fillStyle = css.getPropertyValue('--color-ink').trim(); ctx.beginPath(); ctx.arc(w - 2, mid - head * amp, 3, 0, Math.PI * 2); ctx.fill()
    }

    const tick = () => {
      if (!pending.length && queued.current > 0) { pending = [...BEAT]; queued.current-- }
      samples.push(pending.length ? pending.shift() : (Math.random() - 0.5) * 0.015)
      samples.shift()
      draw()
      raf = requestAnimationFrame(tick)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(c)
    resize()
    let io
    if (!reduce) {
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(tick) }
        if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf) }
      })
      io.observe(c)
    } else {
      // static trace for reduced motion
      samples = samples.map((_, i) => (i % 60 > 20 && i % 60 < 20 + BEAT.length ? BEAT[(i % 60) - 21] : 0))
      draw()
    }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io?.disconnect() }
  }, [])

  return <canvas ref={ref} style={{ width: '100%', height }} role="img" aria-label="Live ECG trace; each new block adds a heartbeat" />
}
