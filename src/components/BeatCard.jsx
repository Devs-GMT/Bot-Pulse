import { useEffect, useRef, useState } from 'react'
import Beat from './Beat.jsx'
import { BOOP_LINES, MOOD_TEXT, deriveMood } from '../lib/mood.js'

/**
 * Mood for Beat from a live snapshot. Also reacts to the `beat:cheer` window event (fired after a successful pin).
 * `forced` overrides it (preview control, ?beat=sweat).
 */
export function useBeatMood(snap, forced) {
  const [cheering, setCheering] = useState(false)
  const timer = useRef(null)
  useEffect(() => {
    const on = () => {
      setCheering(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCheering(false), 3200)
    }
    window.addEventListener('beat:cheer', on)
    return () => { window.removeEventListener('beat:cheer', on); clearTimeout(timer.current) }
  }, [])
  return forced || deriveMood(snap, cheering)
}

const MOODS = ['pulse', 'sleep', 'sweat', 'cheer', 'down']
const initialForced = () => {
  const v = new URLSearchParams(window.location.search).get('beat')
  return MOODS.includes(v) ? v : null
}

export default function BeatCard({ snap }) {
  const [forced, setForced] = useState(initialForced)
  const [line, setLine] = useState(null)
  const mood = useBeatMood(snap, forced)

  const boops = useRef([])
  function boop() {
    const now = Date.now()
    boops.current = [...boops.current.filter((t) => now - t < 2500), now]
    if (boops.current.length >= 3) { boops.current = []; window.dispatchEvent(new CustomEvent('beat:cheer')) }
    setLine(BOOP_LINES[Math.floor(Math.random() * BOOP_LINES.length)])
    setTimeout(() => setLine(null), 1800)
  }

  return (
    <article className="panel flex h-full flex-col items-center justify-between gap-4 p-5 text-center">
      <Beat mood={mood} pulseKey={snap?.newBlockAt || 0} size={220} onBoop={boop} />
      <div>
        <h3 className="text-xl">Nyut</h3>
        <p className="mt-1 min-h-[2.5rem] text-sm text-muted">{forced ? 'Previewing a mood. Tap it again to follow the live chain.' : line || MOOD_TEXT[mood]}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Preview Nyut's moods">
        {MOODS.map((m) => (
          <button key={m} className="btn-line btn-sm aria-pressed:border-ink aria-pressed:bg-paper3" aria-pressed={forced === m} onClick={() => setForced(forced === m ? null : m)}>{m[0].toUpperCase() + m.slice(1)}</button>
        ))}
      </div>
    </article>
  )
}
