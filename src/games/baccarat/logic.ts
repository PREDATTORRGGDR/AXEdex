import { shuffledDeck, type Card, type Rank } from '../../lib/cards'
import { secureRandom, type Rng } from '../../lib/rng'

export type BaccaratBet = 'player' | 'tie' | 'banker'
export type BaccaratWinner = 'player' | 'banker' | 'tie'

export const BACCARAT_LABELS: Record<BaccaratBet, string> = { player: 'Игрок', tie: 'Ничья', banker: 'Банкир' }
export const BACCARAT_ODDS: Record<BaccaratBet, string> = { player: '1:1', tie: '8:1', banker: '0,95:1' }

/** Tens and pictures count 0, aces 1. */
export const pointValue = (rank: Rank) => (rank >= 10 && rank <= 13 ? 0 : rank === 14 ? 1 : rank)

export const score = (cards: readonly Card[]) => cards.reduce((s, c) => s + pointValue(c.rank), 0) % 10

export interface BaccaratRound {
  player: Card[]
  banker: Card[]
  /** Order the cards were dealt in, for the animation. */
  order: ('player' | 'banker')[]
  winner: BaccaratWinner
}

/** Whether the banker draws a third card given its score and the player's third card. */
export function bankerDraws(bankerScore: number, playerThird: Card | null): boolean {
  if (!playerThird) return bankerScore <= 5
  const t = pointValue(playerThird.rank)
  switch (bankerScore) {
    case 0:
    case 1:
    case 2:
      return true
    case 3:
      return t !== 8
    case 4:
      return t >= 2 && t <= 7
    case 5:
      return t >= 4 && t <= 7
    case 6:
      return t === 6 || t === 7
    default:
      return false
  }
}

/** Plays a full Punto Banco coup from a fresh eight-deck shoe. */
export function playBaccarat(rng: Rng = secureRandom, preset?: Card[]): BaccaratRound {
  const shoe = preset ? [...preset] : shuffledDeck(8, rng)
  const next = () => shoe.shift()!
  const player = [next()]
  const banker = [next()]
  player.push(next())
  banker.push(next())
  const order: ('player' | 'banker')[] = ['player', 'banker', 'player', 'banker']

  const p = score(player)
  const b = score(banker)
  if (p < 8 && b < 8) {
    let playerThird: Card | null = null
    if (p <= 5) {
      playerThird = next()
      player.push(playerThird)
      order.push('player')
    }
    if (bankerDraws(b, playerThird)) {
      banker.push(next())
      order.push('banker')
    }
  }
  const ps = score(player)
  const bs = score(banker)
  return { player, banker, order, winner: ps > bs ? 'player' : bs > ps ? 'banker' : 'tie' }
}

/** Total returned for a stake on `bet` (stake included). */
export function baccaratPayout(bet: BaccaratBet, stake: number, winner: BaccaratWinner): number {
  if (winner === 'tie') return bet === 'tie' ? stake * 9 : stake
  if (bet === winner) return bet === 'banker' ? Math.floor(stake * 1.95) : stake * 2
  return 0
}
