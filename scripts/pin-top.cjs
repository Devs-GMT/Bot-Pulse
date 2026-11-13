// Usage: npx hardhat run scripts/pin-top.cjs --network botMainnet
// Pins the five contracts below on PinBoard, one transaction each. Checks gas first and stops if the balance is too low.
const hre = require('hardhat')
const deployments = require('../src/deployments.json')

const NOTE = 'Most active on BOT Chain this week'
const TARGETS = [
  '0x546307af427902A75771434Df831d88219784E19',
  '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C',
  '0x07032d47A1b9f8460cBeE9dC17c1d3E438693929',
  '0xD5452816194a3784dBa983426cCe7c122F4abd30',
  '0x0770A6EBB2F6fde0dF8d156d8e05c09d7EB53C38',
]
const nameOf = (a) => `Contract ${a.slice(0, 6)}...${a.slice(-4)}`

async function main() {
  const [me] = await hre.ethers.getSigners()
  if (!me) throw new Error('No signer: set DEPLOYER_PRIVATE_KEY in .env')
  const { chainId } = await hre.ethers.provider.getNetwork()
  const address = chainId === 677n ? deployments.mainnet : deployments.testnet
  const board = await hre.ethers.getContractAt('PinBoard', address, me)
  const { gasPrice } = await hre.ethers.provider.getFeeData()
  const balance = await hre.ethers.provider.getBalance(me.address)
  console.log(`Wallet ${me.address}, chain ${chainId}, board ${address}, balance ${hre.ethers.formatEther(balance)} BOT`)

  const todo = []
  const week = await board.currentWeek()
  for (const t of TARGETS) {
    const code = await hre.ethers.provider.getCode(t)
    if (code === '0x') { console.log('skip, not a contract:', t); continue }
    if ((await board.lastPinWeek(me.address, t)) >= week) { console.log('skip, already pinned this week:', t); continue }
    todo.push(t)
  }
  let total = 0n
  for (const t of todo) total += (await board.pin.estimateGas(t, nameOf(t), NOTE)) * gasPrice
  console.log(`To pin: ${todo.length}. Estimated gas total ${hre.ethers.formatEther(total)} BOT`)
  if (total * 13n / 10n > balance) throw new Error('Balance is below the estimate plus 30 percent. Nothing was sent.')

  for (const t of todo) {
    const tx = await board.pin(t, nameOf(t), NOTE)
    await tx.wait()
    console.log('pinned', t, tx.hash)
  }
  const after = await hre.ethers.provider.getBalance(me.address)
  console.log(`Done. Board total ${await board.total()}, balance now ${hre.ethers.formatEther(after)} BOT`)
}

main().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1) })
