import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { connectWallet, getEthereum, switchToNetwork } from './wallet.js'
import { friendlyError } from './pinboard.js'

const Ctx = createContext(null)
export const useWallet = () => useContext(Ctx)

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const eth = getEthereum()
    if (!eth) return
    // pick up an already-authorised session without prompting
    eth.request({ method: 'eth_accounts' }).then((a) => setAccount(a[0] || null)).catch(() => {})
    eth.request({ method: 'eth_chainId' }).then((c) => setChainId(parseInt(c, 16))).catch(() => {})
    const onAccounts = (a) => setAccount(a[0] || null)
    const onChain = (c) => setChainId(parseInt(c, 16))
    eth.on?.('accountsChanged', onAccounts)
    eth.on?.('chainChanged', onChain)
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts)
      eth.removeListener?.('chainChanged', onChain)
    }
  }, [])

  const connect = useCallback(async () => {
    setBusy(true); setError(null)
    try { setAccount(await connectWallet()) } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }, [])

  const switchTo = useCallback(async (net) => {
    setBusy(true); setError(null)
    try { await switchToNetwork(net) } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) }
  }, [])

  const value = useMemo(
    () => ({ account, chainId, busy, error, hasWallet: !!getEthereum(), connect, switchTo }),
    [account, chainId, busy, error, connect, switchTo],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
