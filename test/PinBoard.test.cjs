const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@nomicfoundation/hardhat-network-helpers')

describe('PinBoard', () => {
  let board, curator, alice, bob, target, target2

  beforeEach(async () => {
    ;[curator, alice, bob] = await ethers.getSigners()
    board = await (await ethers.getContractFactory('PinBoard')).deploy()
    // any deployed contract works as a pin target
    target = await (await ethers.getContractFactory('PinBoard')).deploy()
    target2 = await (await ethers.getContractFactory('PinBoard')).deploy()
  })

  it('sets the deployer as curator', async () => {
    expect(await board.curator()).to.equal(curator.address)
  })

  it('first pin stores name, note and counters', async () => {
    await board.connect(alice).pin(await target.getAddress(), 'Router', 'Main DEX router')
    const p = await board.pins(await target.getAddress())
    expect(p.name).to.equal('Router')
    expect(p.note).to.equal('Main DEX router')
    expect(p.totalPins).to.equal(1)
    expect(await board.total()).to.equal(1)
  })

  it('emits Pinned with target, pinner and week', async () => {
    const week = await board.currentWeek()
    await expect(board.connect(alice).pin(await target.getAddress(), 'A', 'b'))
      .to.emit(board, 'Pinned')
      .withArgs(await target.getAddress(), alice.address, week)
  })

  it('rejects an EOA target', async () => {
    await expect(board.connect(alice).pin(bob.address, 'x', 'y')).to.be.revertedWith('Target must be a contract')
  })

  it('rejects a second pin from the same wallet in the same week', async () => {
    const t = await target.getAddress()
    await board.connect(alice).pin(t, 'A', 'b')
    await expect(board.connect(alice).pin(t, 'A', 'b')).to.be.revertedWith('Already pinned this week')
  })

  it('allows the same wallet again next week', async () => {
    const t = await target.getAddress()
    await board.connect(alice).pin(t, 'A', 'b')
    await time.increase(7 * 24 * 3600)
    await board.connect(alice).pin(t, 'ignored', 'ignored')
    expect((await board.pins(t)).totalPins).to.equal(2)
  })

  it('other wallets can pin the same contract; the first pinner keeps the name', async () => {
    const t = await target.getAddress()
    await board.connect(alice).pin(t, 'First', 'by alice')
    await board.connect(bob).pin(t, 'Second', 'by bob')
    const p = await board.pins(t)
    expect(p.name).to.equal('First')
    expect(p.totalPins).to.equal(2)
    expect(await board.total()).to.equal(1)
    expect(await board.weekPinsOf(await board.currentWeek(), t)).to.equal(2)
  })

  it('enforces name <= 32 and note <= 80 on the first pin', async () => {
    const t = await target.getAddress()
    await expect(board.connect(alice).pin(t, 'n'.repeat(33), 'ok')).to.be.revertedWith('Name too long')
    await expect(board.connect(alice).pin(t, 'ok', 'n'.repeat(81))).to.be.revertedWith('Note too long')
    await board.connect(alice).pin(t, 'n'.repeat(32), 'n'.repeat(80))
  })

  it('getPins paginates and handles out-of-range', async () => {
    await board.connect(alice).pin(await target.getAddress(), 'A', '')
    await board.connect(alice).pin(await target2.getAddress(), 'B', '')
    expect((await board.getPins(0, 1)).length).to.equal(1)
    expect((await board.getPins(1, 10)).length).to.equal(1)
    expect((await board.getPins(0, 10)).map((p) => p.name)).to.deep.equal(['A', 'B'])
    expect((await board.getPins(5, 10)).length).to.equal(0)
  })

  it('only the curator can hide a pin', async () => {
    const t = await target.getAddress()
    await expect(board.connect(alice).setHidden(t, true)).to.be.revertedWith('Not curator')
    await board.connect(curator).setHidden(t, true)
    expect(await board.isHidden(t)).to.equal(true)
  })
})
