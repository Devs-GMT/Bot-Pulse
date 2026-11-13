// Pure metric functions. `blocks` = normalised blocks sorted ascending (see rpc.getBlock).

export const GWEI = 1_000_000_000n
export const TRANSFER_GAS = 21_000n
export const MIN_SLOW_SEC = 5

/** Average seconds between consecutive blocks in the window. Null with < 2 blocks. */
export function avgBlockTime(blocks) {
  if (blocks.length < 2) return null
  return (blocks[blocks.length - 1].timestamp - blocks[0].timestamp) / (blocks.length - 1)
}

export function txPerBlock(blocks) {
  if (!blocks.length) return 0
  return blocks.reduce((s, b) => s + b.txs.length, 0) / blocks.length
}

/** Transactions with to == null (contract creations). */
export function newContracts(blocks) {
  let n = 0
  for (const b of blocks) for (const t of b.txs) if (t.to === null) n++
  return n
}

export function activeAddresses(blocks) {
  const set = new Set()
  for (const b of blocks) for (const t of b.txs) if (t.from) set.add(t.from)
  return set.size
}

/** Mean gasUsed / gasLimit as a percentage (0-100). */
export function blockFullness(blocks) {
  const usable = blocks.filter((b) => b.gasLimit > 0)
  if (!usable.length) return 0
  return (usable.reduce((s, b) => s + b.gasUsed / b.gasLimit, 0) / usable.length) * 100
}

/** { gwei, transferBot } from a wei gas price. transferBot = 21,000 x gasPrice in BOT. */
export function gasInfo(gasPriceWei) {
  const gwei = Number(gasPriceWei) / Number(GWEI)
  const transferBot = Number(gasPriceWei * TRANSFER_GAS) / 1e18
  return { gwei, transferBot }
}

/** Tx counts per recipient address, sorted descending. Only `to` != null. */
export function callCounts(blocks) {
  const map = new Map()
  for (const b of blocks) for (const t of b.txs) if (t.to) map.set(t.to, (map.get(t.to) || 0) + 1)
  return [...map.entries()].map(([address, calls]) => ({ address, calls })).sort((a, b) => b.calls - a.calls)
}

/**
 * Health rules (PRD section 5):
 *  down    - RPC not responding
 *  healthy - last block newer than 3x avg block time AND latency < 1500 ms
 *  slow    - otherwise
 */
export function healthStatus({ rpcOk, lastBlockAgeSec, avgBlockSec, latencyMs }) {
  if (!rpcOk) return { status: 'down', reason: 'RPC not responding' }
  const avg = avgBlockSec && avgBlockSec > 0 ? avgBlockSec : 2
  // 3x avg block time per the PRD, with a 5 s floor: on sub-second chains 3x avg is shorter than
  // the polling interval and the 1 s timestamp resolution, which would flag a healthy chain as slow.
  if (lastBlockAgeSec != null && lastBlockAgeSec >= Math.max(3 * avg, MIN_SLOW_SEC)) return { status: 'slow', reason: 'Slow blocks' }
  if (latencyMs != null && latencyMs >= 1500) return { status: 'slow', reason: 'Slow RPC' }
  return { status: 'healthy', reason: 'Healthy' }
}

/** Gas considered "high" (Nyut sweats): 3x the median of recent samples, or above a floor. */
export function isGasSpike(currentGwei, history, floorGwei = 100) {
  if (currentGwei >= floorGwei) return true
  if (history.length < 5) return false
  const sorted = [...history].sort((a, b) => a - b)
  const med = sorted[Math.floor(sorted.length / 2)]
  return med > 0 && currentGwei >= med * 3
}

export function computeMetrics(blocks, gasPriceWei) {
  return {
    blocks: blocks.length,
    avgBlockTime: avgBlockTime(blocks),
    txPerBlock: txPerBlock(blocks),
    newContracts: newContracts(blocks),
    activeAddresses: activeAddresses(blocks),
    fullness: blockFullness(blocks),
    gas: gasPriceWei == null ? null : gasInfo(gasPriceWei),
  }
}
