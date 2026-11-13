// MetaMask (EIP-1193) helpers.
export const getEthereum = () => (typeof window !== 'undefined' ? window.ethereum : undefined)

export async function connectWallet() {
  const eth = getEthereum()
  if (!eth) throw new Error('No wallet found. Install MetaMask.')
  const accounts = await eth.request({ method: 'eth_requestAccounts' })
  return accounts[0] || null
}

/** Switch MetaMask to a BOT Chain network, adding it first if the wallet does not know it. */
export async function switchToNetwork(net) {
  const eth = getEthereum()
  if (!eth) throw new Error('No wallet found. Install MetaMask.')
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: net.chainIdHex }] })
  } catch (e) {
    const notAdded = e?.code === 4902 || e?.data?.originalError?.code === 4902 || /unrecognized|not been added|not added/i.test(e?.message || '')
    if (!notAdded) throw e
    await eth.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: net.chainIdHex,
        chainName: net.name,
        nativeCurrency: { name: net.symbol, symbol: net.symbol, decimals: 18 },
        rpcUrls: [net.rpc],
        blockExplorerUrls: [net.explorer],
      }],
    })
  }
}

export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')
