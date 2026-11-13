import deployments from './deployments.json' with { type: 'json' }

export const NETWORKS = {
  mainnet: {
    key: 'mainnet',
    label: 'Mainnet',
    chainId: 677,
    chainIdHex: '0x2a5',
    name: 'BOT Chain Mainnet',
    rpc: 'https://rpc.botchain.ai',
    explorer: 'https://scan.botchain.ai',
    symbol: 'BOT',
    pinBoard: deployments.mainnet || null,
  },
  testnet: {
    key: 'testnet',
    label: 'Testnet',
    chainId: 968,
    chainIdHex: '0x3c8',
    name: 'BOT Chain Testnet',
    rpc: 'https://rpc.bohr.life',
    explorer: 'https://scan.bohr.life',
    symbol: 'BOT',
    faucet: 'https://faucet.botchain.ai/basic',
    pinBoard: deployments.testnet || null,
  },
}

export const POLL_MS = 2500
export const BATCH_SIZE = 20
export const WINDOWS = [100, 1000]
