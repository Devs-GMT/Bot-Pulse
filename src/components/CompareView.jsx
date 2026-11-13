import HealthBadge from './HealthBadge.jsx'
import { metricRows } from '../lib/metricRows.js'
import { fmtInt } from '../lib/format.js'

/** Compare mode: Mainnet and Testnet side by side as a real table. */
export default function CompareView({ main, test }) {
  const a = metricRows(main), b = metricRows(test)
  const loading = !main || !test || main.loading || test.loading
  const cell = (v) => <td className={`num py-4 pr-4 text-lg ${loading ? 'text-muted' : ''}`}>{loading ? '…' : v}</td>
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="border-b border-rule">
            <th className="w-[34%] py-5 pl-6 pr-4 text-sm font-normal text-muted">Metric</th>
            <th className="py-5 pr-4 text-left"><span className="block font-display text-xl font-semibold">Mainnet</span><span className="mt-1 block"><HealthBadge health={main?.health} loading={!main || main.loading} /></span></th>
            <th className="py-5 pr-6 text-left"><span className="block font-display text-xl font-semibold">Testnet</span><span className="mt-1 block"><HealthBadge health={test?.health} loading={!test || test.loading} /></span></th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-rule"><th scope="row" className="py-4 pl-6 pr-4 text-sm font-medium text-ink2">Latest block</th>{cell(main?.blockNumber != null ? `#${fmtInt(main.blockNumber)}` : 'n/a')}{cell(test?.blockNumber != null ? `#${fmtInt(test.blockNumber)}` : 'n/a')}</tr>
          {a.map((row, i) => (
            <tr key={row.key} className="border-b border-rule last:border-0">
              <th scope="row" className="py-4 pl-6 pr-4 text-sm font-medium text-ink2">{row.label}</th>
              {cell(row.value)}{cell(b[i].value)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
