import { shuffledDeck, type Card, type Rank } from '../../lib/cards'
import { secureRandom, type Rng } from '../../lib/rng'

export type DTBet = 'dragon' | 'tie' | 'tiger'
export type DTWinner = 'dragon' | 'tiger' | 'tie'

export const DT_LABELS: Record<DTBet, string> = { dragon: 'Дракон', tie: 'Нічия', tiger: 'Тигр' }
export const DT_ODDS: Record<DTBet, string> = { dragon: '1:1', tie: '11:1', tiger: '1:1' }

/** Ace is low (1), king is high (13). */
export const dtValue = (rank: Rank) => (rank === 14 ? 1 : rank)

export interface DTRound {
  dragon: Card
  tiger: Card
  winner: DTWinner
}

export function playDragonTiger(rng: Rng = secureRandom): DTRound {
  const [dragon, tiger] = shuffledDeck(8, rng)
  const d = dtValue(dragon.rank)
  const t = dtValue(tiger.rank)
  return { dragon, tiger, winner: d > t ? 'dragon' : t > d ? 'tiger' : 'tie' }
}

export function dtPayout(bet: DTBet, stake: number, winner: DTWinner): number {
  if (winner === 'tie') return bet === 'tie' ? stake * 12 : Math.floor(stake / 2)
  return bet === winner ? stake * 2 : 0
}
