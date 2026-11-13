import { useId, useState } from 'react'

/** Accordion: one row open at a time, the answer eases open. Real buttons with aria-expanded, no height animation. */
export default function Faq({ items }) {
  const [open, setOpen] = useState(null)
  const id = useId()
  return (
    <div className="border-b border-rule">
      {items.map(([q, a], i) => {
        const on = open === i
        return (
          <div key={q} className="border-t border-rule">
            <h3 className="!max-w-none">
              <button
                type="button"
                id={`${id}-q${i}`}
                aria-expanded={on}
                aria-controls={`${id}-a${i}`}
                onClick={() => setOpen(on ? null : i)}
                className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-6 py-3 text-left font-display text-[1.375rem] font-semibold leading-tight tracking-tight transition-colors hover:text-ink2"
              >
                {q}
                <span className={`text-muted transition-transform duration-200 ${on ? 'rotate-45' : ''}`} aria-hidden>+</span>
              </button>
            </h3>
            <div id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`} className="faq-body" data-open={on}>
              <div className="overflow-hidden">
                <p className="max-w-xl pb-6 text-ink2">{a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
