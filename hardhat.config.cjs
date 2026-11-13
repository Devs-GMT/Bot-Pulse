require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()

const key = process.env.DEPLOYER_PRIVATE_KEY
const accounts = key ? [key.startsWith('0x') ? key : '0x' + key] : []

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: { evmVersion: 'paris', optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    botTestnet: { url: 'https://rpc.bohr.life', chainId: 968, accounts },
    botMainnet: { url: 'https://rpc.botchain.ai', chainId: 677, accounts },
  },
  // BOT Chain explorers are Blockscout; the API key is a placeholder it ignores
  etherscan: {
    apiKey: { botMainnet: 'blockscout', botTestnet: 'blockscout' },
    customChains: [
      { network: 'botMainnet', chainId: 677, urls: { apiURL: 'https://scan.botchain.ai/api', browserURL: 'https://scan.botchain.ai' } },
      { network: 'botTestnet', chainId: 968, urls: { apiURL: 'https://scan.bohr.life/api', browserURL: 'https://scan.bohr.life' } },
    ],
  },
  sourcify: { enabled: false },
}
