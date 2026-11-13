const STYLE = {
  healthy: { text: 'text-teal', label: 'Healthy' },
  slow: { text: 'text-amber', label: 'Slow' },
  down: { text: 'text-danger', label: 'Down' },
}

/** Status as a word in its colour (healthy, slow, down). No decorative dot. */
export default function HealthBadge({ health, loading }) {
  if (loading || !health) return <span className="dots text-sm text-muted">Connecting</span>
  const s = STYLE[health.status]
  return (
    <span className={`inline-flex items-center rounded-full border border-rule px-3 py-1 text-sm font-medium ${s.text}`}>
      {s.label}{health.status !== 'healthy' && <span className="ml-2 font-normal text-muted">{health.reason}</span>}
    </span>
  )
}
