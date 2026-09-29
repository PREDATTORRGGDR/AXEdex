import { sampleDistinct, secureRandom, type Rng } from '../../lib/rng'

export const KENO_NUMBERS = 40
export const KENO_DRAWN = 10
export const MAX_PICKS = 10

/** Payout multipliers by number of picks → number of hits. */
export const KENO_PAYTABLE: Record<number, Record<number, number>> = {
  1: { 1: 3.8 },
  2: { 1: 1.1, 2: 9 },
  3: { 2: 3.8, 3: 36 },
  4: { 2: 2.2, 3: 7, 4: 95 },
  5: { 2: 1.3, 3: 3.8, 4: 19, 5: 310 },
  6: { 2: 1.1, 3: 2.2, 4: 6.5, 5: 66, 6: 660 },
  7: { 3: 2.6, 4: 6, 5: 25, 6: 190, 7: 1300 },
  8: { 3: 1.9, 4: 3.6, 5: 12, 6: 75, 7: 500, 8: 2500 },
  9: { 3: 1.5, 4: 2.4, 5: 7, 6: 30, 7: 180, 8: 1200, 9: 6000 },
  10: { 3: 1.2, 4: 1.8, 5: 4.6, 6: 14, 7: 72, 8: 480, 9: 3000, 10: 12000 },
}

export function kenoMultiplier(picks: number, hits: number): number {
  return KENO_PAYTABLE[picks]?.[hits] ?? 0
}

/** Draws 10 distinct numbers from 1..40. */
export function drawNumbers(rng: Rng = secureRandom): number[] {
  return sampleDistinct(KENO_NUMBERS, KENO_DRAWN, rng).map((n) => n + 1)
}

export function quickPick(count: number, rng: Rng = secureRandom): number[] {
  return sampleDistinct(KENO_NUMBERS, count, rng)
    .map((n) => n + 1)
    .sort((a, b) => a - b)
}

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}

/** Probability of exactly `hits` matches when `picks` numbers are chosen. */
export function hitChance(picks: number, hits: number): number {
  return (combinations(picks, hits) * combinations(KENO_NUMBERS - picks, KENO_DRAWN - hits)) / combinations(KENO_NUMBERS, KENO_DRAWN)
}

export function kenoRtp(picks: number): number {
  return Object.entries(KENO_PAYTABLE[picks]).reduce((s, [h, m]) => s + hitChance(picks, Number(h)) * m, 0)
}
