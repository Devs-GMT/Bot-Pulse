import { fmtBot, fmtFixed, fmtGwei, fmtInt, fmtMs, fmtPct, fmtSec } from './format.js'

/** The seven signals as display rows. Shared by the metric grid, the compare table and the snapshot card. */
export function metricRows(snap) {
  const m = snap?.metrics
  const n = m?.blocks ?? snap?.windowSize ?? 100
  const last = `in the last ${n} blocks`
  const s = snap?.series || {}
  return [
    { key: 'blockTime', label: 'Avg block time', value: fmtSec(m?.avgBlockTime), hint: last, series: s.blockTime, tone: 'teal' },
    { key: 'txs', label: 'Tx per block', value: fmtFixed(m?.txPerBlock, 2), hint: last, series: s.txs, tone: 'accent' },
    { key: 'gas', label: 'Gas price', value: fmtGwei(m?.gas), hint: m?.gas ? `≈ ${fmtBot(m.gas.transferBot)} per transfer` : '', series: s.gas, tone: 'ink2' },
    { key: 'contracts', label: 'New contracts', value: fmtInt(m?.newContracts), hint: `deployed ${last}`, series: null, tone: 'accent' },
    { key: 'addresses', label: 'Active addresses', value: fmtInt(m?.activeAddresses), hint: `unique senders ${last}`, series: null, tone: 'teal' },
    { key: 'latency', label: 'RPC latency', value: fmtMs(snap?.latencyMs), hint: 'median of 5 pings, every 30 s', series: s.latency, tone: 'teal' },
    { key: 'fullness', label: 'Block fullness', value: fmtPct(m?.fullness), hint: `gas used / limit, ${last}`, series: s.fullness, tone: 'accent' },
  ]
}
