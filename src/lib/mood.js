export const SLEEP_AFTER_SEC = 30

/**
* Nyut's mood from the live snapshot (PRD section 1).
 * Priority: cheer (just pinned) > down (RPC not responding) > sweat (gas spike) > sleep (no new block for > 30 s) > pulse.
 */
export function deriveMood(snap, cheering = false) {
  if (cheering) return 'cheer'
  if (!snap || snap.loading) return 'pulse'
  if (snap.health?.status === 'down') return 'down'
  if (snap.gasSpike) return 'sweat'
  if (snap.lastBlockAgeSec != null && snap.lastBlockAgeSec > SLEEP_AFTER_SEC) return 'sleep'
  return 'pulse'
}

export const MOOD_TEXT = {
  pulse: 'Feeling every block.',
  sleep: 'No new block for a while. Zzz…',
  sweat: 'Gas is spiking. Phew!',
  cheer: 'Pinned! Nice one.',
  down: 'The RPC is not answering.',
}

export const BOOP_LINES = ['Boop!', 'Still beating.', 'Block by block.', 'Careful, that tickles.', 'Gm from the chain.']
