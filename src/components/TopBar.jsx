import { Link } from 'react-router-dom'
import { fmtInt, fmtMs } from '../lib/format.js'

/** V7-style announcement strip above the nav, but with live facts instead of a campaign. */
export default function TopBar({ main }) {
  const ready = main && !main.loading
  const status = ready ? { healthy: 'healthy', slow: 'slow', down: 'down' }[main.health.status] : null
  return (
    <div className="border-b border-rule bg-paper3 text-sm">
      <div className="mx-auto flex min-h-[40px] max-w-[1440px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center">
        <span className="font-medium text-ink">
          {ready ? `Mainnet is ${status}, block #${fmtInt(main.blockNumber)}, RPC answered in ${fmtMs(main.latencyMs)}` : 'Reading BOT Chain'}
        </span>
        <Link to="/app" className="text-muted underline-offset-4 transition-colors hover:text-ink hover:underline">Open the live dashboard</Link>
      </div>
    </div>
  )
}
