import { secureRandom, type Rng } from '../../lib/rng'

export const HOUSE_EDGE = 0.03
/** Exponential growth rate of the multiplier, per second. */
export const GROWTH = 0.13
export const MAX_MULTIPLIER = 1000

/**
 * Crash point with P(point ≥ x) = (1 − edge) / x, so cashing out at any
 * target returns 97% on average. Around 3% of rounds bust instantly at 1.00×.
 */
export function crashPoint(rng: Rng = secureRandom): number {
  const u = rng()
  const raw = (1 - HOUSE_EDGE) / (1 - u)
  return Math.min(MAX_MULTIPLIER, Math.max(1, Math.floor(raw * 100) / 100))
}

/** Multiplier after `ms` of flight, floored to cents like a real ticker. */
export function multiplierAt(ms: number): number {
  return Math.floor(Math.exp((GROWTH * Math.max(0, ms)) / 1000) * 100) / 100
}

/** Flight time (ms) needed to reach `multiplier`. */
export function timeToReach(multiplier: number): number {
  return (Math.log(Math.max(1, multiplier)) / GROWTH) * 1000
}

export function payoutFor(bet: number, multiplier: number): number {
  return Math.floor(bet * multiplier)
}
