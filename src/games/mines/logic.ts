import { sampleDistinct, secureRandom, type Rng } from '../../lib/rng'

export const TILES = 25
export const EDGE = 0.03
export const MAX_MULTIPLIER = 10_000
export const MINE_PRESETS = [1, 3, 5, 10, 24] as const

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}

/**
 * Fair odds of surviving `safe` picks with `mines` hidden among 25 tiles,
 * minus a 3% edge. Floored to hundredths like the on-screen value.
 */
export function multiplierFor(mines: number, safe: number): number {
  if (safe <= 0) return 1
  const fair = combinations(TILES, safe) / combinations(TILES - mines, safe)
  return Math.min(MAX_MULTIPLIER, Math.floor(fair * (1 - EDGE) * 100) / 100)
}

/** Probability that the next pick is safe after `safe` safe picks. */
export function nextSafeChance(mines: number, safe: number): number {
  const left = TILES - safe
  return left <= 0 ? 0 : (left - mines) / left
}

export function placeMines(mines: number, rng: Rng = secureRandom): number[] {
  return sampleDistinct(TILES, mines, rng).sort((a, b) => a - b)
}
