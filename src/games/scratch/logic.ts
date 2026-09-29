import type { IconName } from '../../components/ui/iconNames'
import { randomInt, secureRandom, shuffle, type Rng } from '../../lib/rng'

export type ScratchSymbol = 'crown' | 'gem' | 'star' | 'clover' | 'cherries' | 'bell'

export interface ScratchPrize {
  symbol: ScratchSymbol
  icon: IconName
  name: string
  multiplier: number
  /** Probability that a ticket wins this prize. */
  chance: number
}

export const SCRATCH_PRIZES: ScratchPrize[] = [
  { symbol: 'crown', icon: 'crown', name: 'Корона', multiplier: 100, chance: 0.001 },
  { symbol: 'gem', icon: 'gem-stone', name: 'Бриллиант', multiplier: 25, chance: 0.005 },
  { symbol: 'star', icon: 'glowing-star', name: 'Звезда', multiplier: 10, chance: 0.015 },
  { symbol: 'clover', icon: 'four-leaf-clover', name: 'Клевер', multiplier: 4, chance: 0.05 },
  { symbol: 'cherries', icon: 'cherries', name: 'Вишня', multiplier: 2, chance: 0.1 },
  { symbol: 'bell', icon: 'bell', name: 'Колокольчик', multiplier: 1, chance: 0.18 },
]

export const PRIZE_BY_SYMBOL = Object.fromEntries(SCRATCH_PRIZES.map((p) => [p.symbol, p])) as Record<ScratchSymbol, ScratchPrize>

export interface Ticket {
  cells: ScratchSymbol[]
  prize: ScratchPrize | null
}

export function scratchRtp(): number {
  return SCRATCH_PRIZES.reduce((s, p) => s + p.chance * p.multiplier, 0)
}

/**
 * Builds a 3×3 ticket: the winning symbol (if any) appears exactly three
 * times and every other symbol at most twice, so there is never a second win.
 */
export function buyTicket(rng: Rng = secureRandom): Ticket {
  let roll = rng()
  let prize: ScratchPrize | null = null
  for (const p of SCRATCH_PRIZES) {
    if (roll < p.chance) {
      prize = p
      break
    }
    roll -= p.chance
  }
  const cells: ScratchSymbol[] = prize ? [prize.symbol, prize.symbol, prize.symbol] : []
  const counts = new Map<ScratchSymbol, number>()
  const others = SCRATCH_PRIZES.map((p) => p.symbol).filter((s) => s !== prize?.symbol)
  while (cells.length < 9) {
    const s = others[randomInt(others.length, rng)]
    const c = counts.get(s) ?? 0
    if (c >= 2) continue
    counts.set(s, c + 1)
    cells.push(s)
  }
  return { cells: shuffle(cells, rng), prize }
}
