// Usage: npx hardhat run scripts/deploy.cjs --network botTestnet   (or botMainnet)
const fs = require('fs')
const path = require('path')
const hre = require('hardhat')

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  if (!deployer) throw new Error('No deployer: set DEPLOYER_PRIVATE_KEY in .env')
  const { chainId } = await hre.ethers.provider.getNetwork()
  const bal = await hre.ethers.provider.getBalance(deployer.address)
  console.log(`Deployer ${deployer.address} on chain ${chainId}, balance ${hre.ethers.formatEther(bal)} BOT`)

  const board = await (await hre.ethers.getContractFactory('PinBoard')).deploy()
  await board.waitForDeployment()
  const address = await board.getAddress()
  console.log('PinBoard deployed at', address)

  const file = path.join(__dirname, '..', 'src', 'deployments.json')
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  data[chainId === 677n ? 'mainnet' : 'testnet'] = address
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
  console.log('Saved to src/deployments.json')
}

main().catch((e) => { console.error(e); process.exit(1) })
