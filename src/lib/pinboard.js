import { BrowserProvider, Contract, JsonRpcProvider, getAddress, isAddress } from 'ethers'
import { PINBOARD_ABI } from './abis.js'
import { getEthereum } from './wallet.js'

export const NAME_MAX = 32
export const NOTE_MAX = 80

const readers = {}
const reader = (net) => (readers[net.key] ??= new JsonRpcProvider(net.rpc, net.chainId, { staticNetwork: true }))
const board = (net, runner) => new Contract(net.pinBoard, PINBOARD_ABI, runner || reader(net))

/** Read the Trending Board: visible pins, sorted by this week's pins then all-time pins. */
export async function readBoard(net, limit = 200) {
  if (!net.pinBoard) return { deployed: false, pins: [], total: 0, week: null }
  const c = board(net)
  const [totalBn, weekBn] = await Promise.all([c.total(), c.currentWeek()])
  const total = Number(totalBn)
  const week = Number(weekBn)
  const from = Math.max(0, total - limit)
  const raw = total ? await c.getPins(from, limit) : []
  const pins = await Promise.all(
    raw.map(async (p) => {
      const [weekPins, hidden] = await Promise.all([c.weekPinsOf(week, p.target), c.isHidden(p.target)])
      return { target: p.target, name: p.name, note: p.note, totalPins: Number(p.totalPins), firstAt: Number(p.firstAt), weekPins: Number(weekPins), hidden }
    }),
  )
  return {
    deployed: true,
    total,
    week,
    pins: pins.filter((p) => !p.hidden).sort((a, b) => b.weekPins - a.weekPins || b.totalPins - a.totalPins),
  }
}

/** Pre-flight for the drawer: is the target a contract, is it already pinned, can this wallet pin it now? */
export async function inspectTarget(net, target, user) {
  if (!isAddress(target)) return { valid: false, error: 'Not a valid address' }
  const addr = getAddress(target)
  const provider = reader(net)
  const code = await provider.getCode(addr)
  if (!code || code === '0x') return { valid: false, error: 'That address is not a contract' }
  if (!net.pinBoard) return { valid: false, error: `PinBoard is not deployed on ${net.label} yet` }
  const c = board(net)
  const [existing, weekBn, last] = await Promise.all([
    c.pins(addr),
    c.currentWeek(),
    user ? c.lastPinWeek(user, addr) : Promise.resolve(0n),
  ])
  const pinned = existing.target !== '0x0000000000000000000000000000000000000000'
  return {
    valid: true,
    address: addr,
    pinned,
    name: pinned ? existing.name : '',
    note: pinned ? existing.note : '',
    totalPins: pinned ? Number(existing.totalPins) : 0,
    alreadyThisWeek: !!user && last >= weekBn,
  }
}

/** Send the pin transaction through the connected wallet. Returns the tx hash. */
export async function pinContract(net, { target, name, note }) {
  const eth = getEthereum()
  if (!eth) throw new Error('No wallet found. Install MetaMask.')
  if (!net.pinBoard) throw new Error(`PinBoard is not deployed on ${net.label} yet`)
  if (name.length > NAME_MAX) throw new Error(`Name must be ${NAME_MAX} characters or fewer`)
  if (note.length > NOTE_MAX) throw new Error(`Note must be ${NOTE_MAX} characters or fewer`)
  const signer = await new BrowserProvider(eth).getSigner()
  const tx = await board(net, signer).pin(getAddress(target), name, note)
  await tx.wait()
  window.dispatchEvent(new CustomEvent('beat:cheer')) // the mascot cheers (Phase 6)
  return tx.hash
}

/** Rough gas cost, in BOT, of pinning one contract from this wallet right now (null when it cannot be estimated). */
export async function estimatePinCost(net, { target, name, note }, user) {
  try {
    const gas = await board(net).pin.estimateGas(getAddress(target), name, note, { from: user })
    const price = (await reader(net).getFeeData()).gasPrice
    return price ? Number(gas * price) / 1e18 : null
  } catch { return null }
}

export function friendlyError(e) {
  const reason = e?.reason || e?.revert?.args?.[0]
  if (reason) return reason
  if (e?.code === 'ACTION_REJECTED' || e?.code === 4001) return 'Transaction rejected in your wallet'
  if (e?.code === 'INSUFFICIENT_FUNDS') return 'Not enough BOT for gas'
  return e?.shortMessage || e?.message || 'Something went wrong'
}
