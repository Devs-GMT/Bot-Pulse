import test from 'node:test'
import assert from 'node:assert/strict'
import { avgBlockTime, txPerBlock, newContracts, activeAddresses, blockFullness, gasInfo, callCounts, healthStatus, isGasSpike } from './metrics.js'
import { median } from './rpc.js'

const blk = (number, timestamp, txs, gasUsed = 0, gasLimit = 100) => ({ number, timestamp, gasUsed, gasLimit, txs })
const tx = (from, to) => ({ from, to, hash: '0x' })

const blocks = [
  blk(1, 100, [tx('a', 'c1'), tx('b', null)], 50),
  blk(2, 102, [tx('a', 'c1'), tx('a', 'c2')], 25),
  blk(3, 104, [], 0),
  blk(4, 108, [tx('c', 'c1')], 75),
]

test('avgBlockTime is mean delta between blocks', () => assert.equal(avgBlockTime(blocks), 8 / 3))
test('avgBlockTime needs 2+ blocks', () => assert.equal(avgBlockTime([blocks[0]]), null))
test('txPerBlock', () => assert.equal(txPerBlock(blocks), 5 / 4))
test('txPerBlock of empty window', () => assert.equal(txPerBlock([]), 0))
test('newContracts counts to == null', () => assert.equal(newContracts(blocks), 1))
test('activeAddresses counts unique senders', () => assert.equal(activeAddresses(blocks), 3))
test('blockFullness is mean gasUsed/gasLimit in %', () => assert.equal(blockFullness(blocks), 37.5))

test('gasInfo converts wei to gwei and 21,000-gas transfer cost', () => {
  const g = gasInfo(2_000_000_000n)
  assert.equal(g.gwei, 2)
  assert.ok(Math.abs(g.transferBot - 21_000 * 2e-9) < 1e-15)
})

test('callCounts groups by recipient, sorted', () => {
  assert.deepEqual(callCounts(blocks), [
    { address: 'c1', calls: 3 },
    { address: 'c2', calls: 1 },
  ])
})

test('health: down when RPC does not respond', () => {
  assert.deepEqual(healthStatus({ rpcOk: false }), { status: 'down', reason: 'RPC not responding' })
})
test('health: healthy when block is fresh and latency low', () => {
  assert.equal(healthStatus({ rpcOk: true, lastBlockAgeSec: 3, avgBlockSec: 2, latencyMs: 200 }).status, 'healthy')
})
test('health: slow when last block older than 3x avg', () => {
  const h = healthStatus({ rpcOk: true, lastBlockAgeSec: 6, avgBlockSec: 2, latencyMs: 200 })
  assert.deepEqual(h, { status: 'slow', reason: 'Slow blocks' })
})
test('health: sub-second chain with a 3 s old block is still healthy (5 s floor)', () => {
  assert.equal(healthStatus({ rpcOk: true, lastBlockAgeSec: 3, avgBlockSec: 0.75, latencyMs: 125 }).status, 'healthy')
  assert.equal(healthStatus({ rpcOk: true, lastBlockAgeSec: 5, avgBlockSec: 0.75, latencyMs: 125 }).status, 'slow')
})
test('health: slow when latency >= 1500 ms', () => {
  assert.equal(healthStatus({ rpcOk: true, lastBlockAgeSec: 1, avgBlockSec: 2, latencyMs: 1500 }).status, 'slow')
})

test('gas spike: absolute floor and 3x median', () => {
  assert.equal(isGasSpike(150, []), true)
  assert.equal(isGasSpike(3, [1, 1, 1, 1, 1]), true)
  assert.equal(isGasSpike(2, [1, 1, 1, 1, 1]), false)
  assert.equal(isGasSpike(30, [1, 1]), false) // not enough history
})

test('median odd / even', () => {
  assert.equal(median([5, 1, 3]), 3)
  assert.equal(median([4, 1, 3, 2]), 2.5)
})
