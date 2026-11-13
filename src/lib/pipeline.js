import { BATCH_SIZE, POLL_MS } from '../config.js'
import { getBlockNumber, getBlocksRange, getGasPriceWei, getCode, measureLatency } from './rpc.js'
import { computeMetrics, callCounts, healthStatus, gasInfo, isGasSpike } from './metrics.js'

/** Rolling mean: block timestamps have 1 s resolution, so raw deltas alternate 0/1 and look like noise. */
const rolling = (arr, n) => arr.map((_, i) => { const s = arr.slice(Math.max(0, i - n + 1), i + 1); return s.reduce((a, v) => a + v, 0) / s.length })

const LATENCY_EVERY_MS = 30_000
const ACTIVE_TOP = 10
const ACTIVE_SCAN = 40 // how many top recipients to code-check at most
const FAILS_FOR_DOWN = 2

/**
 * Live data engine for one network. Browser-side only, no backend.
 * Keeps a rolling window of the last `windowSize` blocks and emits a snapshot on every change.
 */
export class Pipeline {
  constructor(network, windowSize = 100) {
    this.net = network
    this.windowSize = windowSize
    this.blocks = []
    this.codeCache = new Map() // address -> isContract
    this.gasWei = null
    this.gasHistory = []
    this.latencyMs = null
    this.latencyHistory = []
    this.fails = 0
    this.loading = true
    this.error = null
    this.listeners = new Set()
    this.timers = []
    this.stopped = false
    this.snapshot = this.#build()
  }

  subscribe(fn) {
    this.listeners.add(fn)
    fn(this.snapshot)
    return () => this.listeners.delete(fn)
  }

  async start() {
    try {
      const head = await getBlockNumber(this.net.rpc)
      const from = Math.max(0, head - this.windowSize + 1)
      this.blocks = await getBlocksRange(this.net.rpc, from, head, BATCH_SIZE)
      this.fails = 0
    } catch (e) {
      this.#fail(e)
    }
    this.loading = false
    this.lastAdvanceAt = Date.now()
    await Promise.allSettled([this.#refreshGas(), this.#refreshLatency()])
    await this.#refreshActive()
    this.#emit()
    if (this.stopped) return
    this.timers.push(setInterval(() => this.#poll(), POLL_MS))
    this.timers.push(setInterval(() => this.#refreshLatency().then(() => this.#emit()), LATENCY_EVERY_MS))
    this.timers.push(setInterval(() => this.#refreshGas().then(() => this.#emit()), 10_000))
  }

  stop() {
    this.stopped = true
    this.timers.forEach(clearInterval)
    this.timers = []
    this.listeners.clear()
  }

  async #poll() {
    try {
      const head = await getBlockNumber(this.net.rpc)
      this.fails = 0
      this.error = null
      const last = this.blocks.length ? this.blocks[this.blocks.length - 1].number : head - 1
      if (head > last) {
        // if we fell far behind, only catch up on the window
        const from = Math.max(last + 1, head - this.windowSize + 1)
        const fresh = await getBlocksRange(this.net.rpc, from, head, BATCH_SIZE)
        if (fresh.length) {
          this.blocks = [...this.blocks, ...fresh].slice(-this.windowSize)
          await this.#refreshActive()
          this.newBlockAt = Date.now()
          this.lastAdvanceAt = Date.now()
        }
      }
    } catch (e) {
      this.#fail(e)
    }
    this.#emit()
  }

  #fail(e) {
    this.fails++
    this.error = e?.message || 'RPC error'
  }

  async #refreshGas() {
    try {
      this.gasWei = await getGasPriceWei(this.net.rpc)
      this.gasHistory = [...this.gasHistory, gasInfo(this.gasWei).gwei].slice(-60)
    } catch { /* keep previous */ }
  }

  async #refreshLatency() {
    try {
      this.latencyMs = await measureLatency(this.net.rpc, 5)
      this.latencyHistory = [...this.latencyHistory, this.latencyMs].slice(-40)
    } catch {
      this.latencyMs = null
      this.#fail(new Error('RPC not responding'))
    }
  }

  /** Most active contracts: group by `to`, keep only addresses with code (cached). */
  async #refreshActive() {
    const counts = callCounts(this.blocks).slice(0, ACTIVE_SCAN)
    const unknown = counts.filter((c) => !this.codeCache.has(c.address))
    await Promise.allSettled(
      unknown.map(async (c) => {
        const code = await getCode(this.net.rpc, c.address)
        this.codeCache.set(c.address, !!code && code !== '0x')
      }),
    )
    this.active = counts.filter((c) => this.codeCache.get(c.address)).slice(0, ACTIVE_TOP)
  }

  #build() {
    const last = this.blocks[this.blocks.length - 1]
    const metrics = computeMetrics(this.blocks, this.gasWei)
    // age = time since we last saw the head advance (local clock only), so a wrong PC clock cannot fake "slow"
    const lastBlockAgeSec = last && this.lastAdvanceAt ? (Date.now() - this.lastAdvanceAt) / 1000 : null
    const health = healthStatus({
      rpcOk: this.fails < FAILS_FOR_DOWN && (this.blocks.length > 0 || this.loading),
      lastBlockAgeSec,
      avgBlockSec: metrics.avgBlockTime,
      latencyMs: this.latencyMs,
    })
    return {
      network: this.net.key,
      windowSize: this.windowSize,
      loading: this.loading,
      error: this.error,
      blockNumber: last?.number ?? null,
      lastBlockTimestamp: last?.timestamp ?? null,
      lastBlockAgeSec,
      latencyMs: this.latencyMs,
      metrics,
      active: this.active || [],
      health,
      gasSpike: metrics.gas ? isGasSpike(metrics.gas.gwei, this.gasHistory.slice(0, -1)) : false,
      newBlockAt: this.newBlockAt || null,
      series: this.#series(),
      recent: this.blocks.slice(-48).map((b) => ({ n: b.number, tx: b.txs.length, ts: b.timestamp })),
    }
  }

  /** Small per-block series for sparklines (last 60 blocks). */
  #series() {
    const b = this.blocks.slice(-61)
    return {
      blockTime: rolling(b.slice(1).map((x, i) => x.timestamp - b[i].timestamp), 8),
      txs: b.slice(1).map((x) => x.txs.length),
      fullness: b.slice(1).map((x) => (x.gasLimit ? (x.gasUsed / x.gasLimit) * 100 : 0)),
      gas: this.gasHistory,
      latency: this.latencyHistory,
    }
  }

  #emit() {
    if (this.stopped) return
    this.snapshot = this.#build()
    this.listeners.forEach((fn) => fn(this.snapshot))
  }
}
