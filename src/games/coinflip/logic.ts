import { secureRandom, type Rng } from '../../lib/rng'

export type CoinSide = 'heads' | 'tails'
export const COIN_LABELS: Record<CoinSide, string> = { heads: 'Орёл', tails: 'Решка' }
/** Each correct call multiplies winnings by 1.94 (97% of a fair 2×). */
export const COIN_STEP = 1.94

export const flipCoin = (rng: Rng = secureRandom): CoinSide => (rng() < 0.5 ? 'heads' : 'tails')

export const coinMultiplier = (wins: number) => Math.floor(Math.pow(COIN_STEP, wins) * 100) / 100
