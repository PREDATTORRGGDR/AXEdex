import { shuffledDeck, type Card, type Rank } from '../../lib/cards'
import { secureRandom, type Rng } from '../../lib/rng'

export const DECKS = 6
export const SHOE_SIZE = DECKS * 52
/** Reshuffle once fewer than a quarter of the shoe remains (the cut card). */
export const RESHUFFLE_AT = Math.floor(SHOE_SIZE * 0.25)
export const MAX_HANDS = 4

export function cardValue(rank: Rank): number {
  if (rank === 14) return 11
  return Math.min(rank, 10)
}

export interface HandTotal {
  total: number
  /** An ace is still counted as 11. */
  soft: boolean
}

export function handTotal(cards: readonly Card[]): HandTotal {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += cardValue(c.rank)
    if (c.rank === 14) aces++
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return { total, soft: aces > 0 }
}

export const isBust = (cards: readonly Card[]) => handTotal(cards).total > 21
export const isBlackjack = (cards: readonly Card[]) => cards.length === 2 && handTotal(cards).total === 21

/** Dealer draws to 16 and stands on all 17s, including soft 17. */
export const dealerShouldHit = (cards: readonly Card[]) => handTotal(cards).total < 17

export interface PlayerHand {
  cards: Card[]
  bet: number
  doubled: boolean
  done: boolean
  /** Split aces receive exactly one card each. */
  splitAces: boolean
  fromSplit: boolean
}

export const newHand = (cards: Card[], bet: number, fromSplit = false, splitAces = false): PlayerHand => ({
  cards,
  bet,
  doubled: false,
  done: splitAces,
  splitAces,
  fromSplit,
})

export function canSplit(hand: PlayerHand, handCount: number): boolean {
  return (
    hand.cards.length === 2 &&
    !hand.done &&
    !hand.splitAces &&
    handCount < MAX_HANDS &&
    cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank)
  )
}

export function canDouble(hand: PlayerHand): boolean {
  return hand.cards.length === 2 && !hand.done && !hand.splitAces
}

export type HandOutcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust'

export const OUTCOME_LABEL: Record<HandOutcome, string> = {
  blackjack: 'Блэкджек!',
  win: 'Победа',
  push: 'Ничья',
  lose: 'Проигрыш',
  bust: 'Перебор',
}

export interface HandResult {
  outcome: HandOutcome
  /** Chips returned for this hand, stake included. */
  payout: number
}

export function settleHand(hand: PlayerHand, dealer: readonly Card[]): HandResult {
  const player = handTotal(hand.cards).total
  if (player > 21) return { outcome: 'bust', payout: 0 }
  const natural = !hand.fromSplit && isBlackjack(hand.cards)
  const dealerNatural = isBlackjack(dealer)
  if (natural && dealerNatural) return { outcome: 'push', payout: hand.bet }
  if (natural) return { outcome: 'blackjack', payout: Math.floor(hand.bet * 2.5) }
  if (dealerNatural) return { outcome: 'lose', payout: 0 }
  const d = handTotal(dealer).total
  if (d > 21 || player > d) return { outcome: 'win', payout: hand.bet * 2 }
  if (player === d) return { outcome: 'push', payout: hand.bet }
  return { outcome: 'lose', payout: 0 }
}

export const createShoe = (rng: Rng = secureRandom) => shuffledDeck(DECKS, rng)
export const needsShuffle = (shoe: readonly Card[]) => shoe.length < RESHUFFLE_AT
