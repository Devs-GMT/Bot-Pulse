import { useState } from 'react'

/** Copies a value and says so, for a second and a half. Works without the async clipboard API too. */
export default function CopyButton({ text, small = false, className = '' }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text) } catch {
      const t = document.createElement('textarea')
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'
      document.body.appendChild(t); t.select(); try { document.execCommand('copy') } catch { /* nothing else to try */ } t.remove()
    }
    setDone(true)
    setTimeout(() => setDone(false), 1600)
  }
  return (
    <button type="button" onClick={copy} aria-label={`Copy ${text}`} className={`btn-line ${small ? 'btn-sm' : ''} ${className}`}>
      {done ? 'Copied' : 'Copy'}
      <span className="visually-hidden" role="status">{done ? 'Address copied' : ''}</span>
    </button>
  )
}
