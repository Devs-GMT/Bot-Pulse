import { useEffect, useState } from 'react'
import { NETWORKS } from '../config.js'
import { Pipeline } from './pipeline.js'

/** React hook: live snapshot for a network ('mainnet' | 'testnet') over the last `windowSize` blocks. */
export function usePulse(networkKey, windowSize = 100, enabled = true) {
  const [snap, setSnap] = useState(null)
  useEffect(() => {
    setSnap(null)
    if (!enabled) return
    const p = new Pipeline(NETWORKS[networkKey], windowSize)
    const off = p.subscribe(setSnap)
    p.start()
    return () => {
      off()
      p.stop()
    }
  }, [networkKey, windowSize, enabled])
  return snap
}
