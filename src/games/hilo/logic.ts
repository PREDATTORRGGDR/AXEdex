import { RANKS, SUITS, type Card, type Rank } from '../../lib/cards'
import { randomInt, secureRandom, type Rng } from '../../lib/rng'

export const EDGE = 0.03

export type GuessId = 'higherEq' | 'lowerEq' | 'higher' | 'lower' | 'same'

export interface GuessOption {
  id: GuessId
  label: string
  chance: number
  multiplier: number
}

let seq = 0

/** Draws from an infinite deck (every rank and suit equally likely each time). */
export function drawCard(rng: Rng = secureRandom): Card {
  const rank = RANKS[randomInt(RANKS.length, rng)]
  const suit = SUITS[randomInt(SUITS.length, rng)]
  return { id: `hl-${++seq}-${rank}-${suit}`, rank, suit }
}

const stepMultiplier = (chance: number) => Math.floor(((1 - EDGE) / chance) * 100) / 100

/** Available predictions for the current card; ties count toward "or equal". */
export function optionsFor(rank: Rank): GuessOption[] {
  const n = RANKS.length
  const make = (id: GuessId, label: string, ways: number): GuessOption => ({
    id,
    label,
    chance: ways / n,
    multiplier: stepMultiplier(ways / n),
  })
  if (rank === 2) return [make('higher', 'Вище', n - 1), make('same', 'Така сама', 1)]
  if (rank === 14) return [make('lower', 'Нижче', n - 1), make('same', 'Така сама', 1)]
  return [make('higherEq', 'Вище або рівно', 15 - rank), make('lowerEq', 'Нижче або рівно', rank - 1)]
}

export function isCorrect(guess: GuessId, current: Rank, next: Rank): boolean {
  switch (guess) {
    case 'higherEq':
      return next >= current
    case 'lowerEq':
      return next <= current
    case 'higher':
      return next > current
    case 'lower':
      return next < current
    case 'same':
      return next === current
  }
}
