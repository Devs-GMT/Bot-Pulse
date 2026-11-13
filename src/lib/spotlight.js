// One passive listener for the whole page: panels with `.glow` follow the pointer with a soft highlight.
// It only sets two CSS variables; the look itself is in index.css and needs no motion at all.
if (typeof document !== 'undefined') {
  document.addEventListener('pointermove', (e) => {
    const el = e.target?.closest?.('.glow')
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, { passive: true })
}
