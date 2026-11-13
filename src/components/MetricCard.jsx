import { useEffect, useRef, useState } from 'react'
import Sparkline from './Sparkline.jsx'

const TONE = { teal: 'text-teal', accent: 'text-accent', ink2: 'text-ink2' }
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const NUMBER = /-?\d[\d,]*\.?\d*/

/** Counts the number inside `value` up from 0 the first time the tile is seen, then simply follows the live value. */
function useCountUp(value, enabled, ref) {
  const [shown, setShown] = useState(value)
  const done = useRef(false)
  const latest = useRef(value)
  latest.current = value
  useEffect(() => {
    if (done.current) { setShown(value); return }
    const m = NUMBER.exec(value || '')
    if (!enabled || !m || reduced() || typeof IntersectionObserver === 'undefined') { done.current = !!m && enabled; setShown(value); return }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      done.current = true
      const target = parseFloat(m[0].replace(/,/g, '')), dec = (m[0].split('.')[1] || '').length, t0 = performance.now()
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 900), v = target * (1 - (1 - k) ** 3)
        setShown(k < 1 ? latest.current.replace(m[0], v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })) : latest.current)
        if (k < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, { threshold: 0.4 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [value, enabled])
  return shown
}

/** One signal: its name, the live value, what window it covers, and its trend. A tile, never a card in a card. */
export default function MetricCard({ label, value, hint, series, tone = 'accent', loading, countUp = false, className = '' }) {
  const ref = useRef(null)
  const shown = useCountUp(loading ? '' : value, countUp && !loading, ref)
  return (
    <article ref={ref} className={`panel glow lift flex flex-col justify-between p-5 ${className}`}>
      <div>
        <h3 className="font-sans text-sm font-normal tracking-normal text-muted">{label}</h3>
        <p className={`num mt-3 text-[32px] leading-none ${loading ? 'text-muted' : ''}`}>{loading ? '…' : shown}</p>
        <p className="mt-2 min-h-[1.25rem] text-[13px] text-muted">{hint}</p>
      </div>
      <Sparkline className={`mt-4 ${TONE[tone]}`} data={series} />
    </article>
  )
}
