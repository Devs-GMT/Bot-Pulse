import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveMood } from './mood.js'

const snap = (over = {}) => ({ loading: false, gasSpike: false, lastBlockAgeSec: 1, health: { status: 'healthy' }, ...over })

test('pulse while the chain is healthy', () => assert.equal(deriveMood(snap()), 'pulse'))
test('pulse while loading or without data', () => {
  assert.equal(deriveMood(null), 'pulse')
  assert.equal(deriveMood(snap({ loading: true })), 'pulse')
})
test('sleep after 30 s without a new block', () => {
  assert.equal(deriveMood(snap({ lastBlockAgeSec: 30 })), 'pulse')
  assert.equal(deriveMood(snap({ lastBlockAgeSec: 31 })), 'sleep')
})
test('down when the RPC is not answering', () => assert.equal(deriveMood(snap({ health: { status: 'down' } })), 'down'))
test('down outranks sweat and sleep', () => assert.equal(deriveMood(snap({ health: { status: 'down' }, gasSpike: true, lastBlockAgeSec: 99 })), 'down'))
test('sweat on a gas spike', () => assert.equal(deriveMood(snap({ gasSpike: true })), 'sweat'))
test('sweat outranks sleep', () => assert.equal(deriveMood(snap({ gasSpike: true, lastBlockAgeSec: 99 })), 'sweat'))
test('cheer outranks everything', () => assert.equal(deriveMood(snap({ gasSpike: true, lastBlockAgeSec: 99 }), true), 'cheer'))
