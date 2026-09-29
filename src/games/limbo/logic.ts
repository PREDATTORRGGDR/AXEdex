import { secureRandom, type Rng } from '../../lib/rng'

export const LIMBO_EDGE = 0.03
export const MIN_TARGET = 1.01
export const MAX_TARGET = 1000
const CAP = 1_000_000

/** Result multiplier with P(result ≥ x) = 0.97 / x. */
export function limboResult(rng: Rng = secureRandom): number {
  const raw = (1 - LIMBO_EDGE) / (1 - rng())
  return Math.min(CAP, Math.max(1, Math.floor(raw * 100) / 100))
}

export const winChance = (target: number) => Math.min(1, (1 - LIMBO_EDGE) / target)

export const targetForChance = (chance: number) => Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(((1 - LIMBO_EDGE) / chance) * 100) / 100))

export const clampTarget = (t: number) => Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(t * 100) / 100))
