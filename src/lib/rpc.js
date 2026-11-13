// Minimal JSON-RPC client. Runs in the browser (and in Node 18+ for tests).
let nextId = 1

export async function rpcCall(url, method, params = [], { timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.error) throw new Error(json.error.message || 'RPC error')
    return json.result
  } finally {
    clearTimeout(timer)
  }
}

const hex = (v) => Number(BigInt(v))

export const getBlockNumber = async (url) => hex(await rpcCall(url, 'eth_blockNumber'))
export const getGasPriceWei = async (url) => BigInt(await rpcCall(url, 'eth_gasPrice'))
export const getCode = (url, addr) => rpcCall(url, 'eth_getCode', [addr, 'latest'])

/** Full block (with transactions), normalised to plain numbers. Null if the node has no such block. */
export async function getBlock(url, number) {
  const b = await rpcCall(url, 'eth_getBlockByNumber', ['0x' + number.toString(16), true])
  if (!b) return null
  return {
    number: hex(b.number),
    timestamp: hex(b.timestamp),
    gasUsed: hex(b.gasUsed),
    gasLimit: hex(b.gasLimit),
    txs: (b.transactions || []).map((t) => ({ from: t.from?.toLowerCase(), to: t.to ? t.to.toLowerCase() : null, hash: t.hash })),
  }
}

/** Fetch blocks [from..to] in parallel batches. Failed blocks are skipped, not fatal. */
export async function getBlocksRange(url, from, to, batchSize = 20) {
  const nums = []
  for (let n = from; n <= to; n++) nums.push(n)
  const out = []
  for (let i = 0; i < nums.length; i += batchSize) {
    const res = await Promise.allSettled(nums.slice(i, i + batchSize).map((n) => getBlock(url, n)))
    for (const r of res) if (r.status === 'fulfilled' && r.value) out.push(r.value)
  }
  return out.sort((a, b) => a.number - b.number)
}

/** Median round-trip of `samples` eth_blockNumber pings, in ms. Throws if every ping fails. */
export async function measureLatency(url, samples = 5) {
  const times = []
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now()
    try {
      await rpcCall(url, 'eth_blockNumber', [], { timeoutMs: 5000 })
      times.push(performance.now() - t0)
    } catch { /* ignore a single failed ping */ }
  }
  if (!times.length) throw new Error('RPC not responding')
  return median(times)
}

export function median(values) {
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
