import { useCallback, useEffect, useState } from 'react'
import { readBoard, friendlyError } from '../lib/pinboard.js'

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`

/** The community's on-chain Trending Board, read from the PinBoard contract. */
export default function TrendingBoard({ net, refreshKey = 0, onPin, app = false }) {
  const sm = app ? ' btn-sm' : ''
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    readBoard(net).then((d) => { setData(d); setError(null) }).catch((e) => setError(friendlyError(e)))
  }, [net])

  useEffect(() => {
    setData(null)
    load()
    const t = setInterval(load, 20_000)
    return () => clearInterval(t)
  }, [load, refreshKey])

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl">Trending Board <span className="text-base font-normal text-muted">on {net.label}</span></h3>
        <button className={`btn${sm}`} onClick={() => onPin('')}>Pin a contract</button>
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {!error && !data && <p className="dots mt-4 text-sm text-muted">Loading</p>}
      {data && !data.deployed && <p className="mt-4 text-sm text-amber">PinBoard is not deployed on {net.label} yet.</p>}
      {data?.deployed && data.pins.length === 0 && <p className="mt-4 text-sm text-muted">Nothing pinned yet. Be the first.</p>}
      {data?.pins.length > 0 && (
        <ul className="mt-4">
          {data.pins.map((p, i) => (
            <li key={p.target} className="row-link flex items-center gap-4 py-3">
              <span className="num w-6 text-sm text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name || 'Unnamed'}</p>
                <p className="truncate text-sm text-muted">{p.note}</p>
                <a className="num text-sm text-muted underline-offset-4 hover:text-ink hover:underline" href={`${net.explorer}/address/${p.target}`} target="_blank" rel="noreferrer">{short(p.target)}</a>
              </div>
              <div className="text-right">
                <p className="num text-xl text-accent">{p.weekPins}</p>
                <p className="text-xs text-muted">this week</p>
                <p className="num text-xs text-muted">{p.totalPins} total</p>
              </div>
              <button className={`btn-line${sm}`} onClick={() => onPin(p.target)}>Pin</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
