import { shuffledDeck, type Card, type Rank } from '../../lib/cards'
import { secureRandom, type Rng } from '../../lib/rng'

export type HandRank =
  | 'royal'
  | 'straightFlush'
  | 'fourKind'
  | 'fullHouse'
  | 'flush'
  | 'straight'
  | 'threeKind'
  | 'twoPair'
  | 'jacksOrBetter'

export const HAND_ORDER: HandRank[] = ['royal', 'straightFlush', 'fourKind', 'fullHouse', 'flush', 'straight', 'threeKind', 'twoPair', 'jacksOrBetter']

export const HAND_NAMES: Record<HandRank, string> = {
  royal: 'Роял-флеш',
  straightFlush: 'Стрит-флеш',
  fourKind: 'Каре',
  fullHouse: 'Фулл-хаус',
  flush: 'Флеш',
  straight: 'Стрит',
  threeKind: 'Тройка',
  twoPair: 'Две пары',
  jacksOrBetter: 'Валеты или старше',
}

/** «9/6 Jacks or Better» pays per coin. A royal flush pays 800 per coin at max bet. */
export const PAYTABLE: Record<HandRank, number> = {
  royal: 250,
  straightFlush: 50,
  fourKind: 25,
  fullHouse: 9,
  flush: 6,
  straight: 4,
  threeKind: 3,
  twoPair: 2,
  jacksOrBetter: 1,
}

export const MAX_COINS = 5
export const ROYAL_MAX_BET = 800

export function payPerCoin(rank: HandRank, coins: number): number {
  return rank === 'royal' && coins === MAX_COINS ? ROYAL_MAX_BET : PAYTABLE[rank]
}

function counts(cards: readonly Card[]): Map<Rank, number> {
  const m = new Map<Rank, number>()
  for (const c of cards) m.set(c.rank, (m.get(c.rank) ?? 0) + 1)
  return m
}

function isStraight(ranks: number[]): boolean {
  const u = [...new Set(ranks)].sort((a, b) => a - b)
  if (u.length !== 5) return false
  if (u[4] - u[0] === 4) return true
  // Wheel: A-2-3-4-5
  return u.join() === '2,3,4,5,14'
}

export function evaluateHand(cards: readonly Card[]): HandRank | null {
  const ranks = cards.map((c) => c.rank)
  const flush = cards.every((c) => c.suit === cards[0].suit)
  const straight = isStraight(ranks)
  const groups = [...counts(cards).entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const top = groups[0][1]

  if (straight && flush) return Math.min(...ranks) === 10 ? 'royal' : 'straightFlush'
  if (top === 4) return 'fourKind'
  if (top === 3 && groups[1][1] === 2) return 'fullHouse'
  if (flush) return 'flush'
  if (straight) return 'straight'
  if (top === 3) return 'threeKind'
  if (top === 2 && groups[1][1] === 2) return 'twoPair'
  if (top === 2 && groups[0][0] >= 11) return 'jacksOrBetter'
  return null
}

export interface Deal {
  deck: Card[]
  hand: Card[]
}

export function deal(rng: Rng = secureRandom): Deal {
  const deck = shuffledDeck(1, rng)
  return { hand: deck.slice(0, 5), deck: deck.slice(5) }
}

/** Replaces every card that is not held with the next cards from the deck. */
export function draw(hand: readonly Card[], held: readonly boolean[], deck: readonly Card[]): Card[] {
  let next = 0
  return hand.map((c, i) => (held[i] ? c : deck[next++]))
}

/**
 * Simple-strategy hold advice (close to optimal for 9/6 Jacks or Better):
 * made hands, 4 to a royal/straight flush, pairs, 4-flushes, open straights,
 * then high cards.
 */
export function suggestHolds(hand: readonly Card[]): boolean[] {
  const rank = evaluateHand(hand)
  const all = hand.map(() => true)
  const none = hand.map(() => false)
  const holdWhere = (pred: (c: Card) => boolean) => hand.map(pred)

  if (rank && ['royal', 'straightFlush', 'fullHouse', 'flush', 'straight'].includes(rank)) return all
  const c = counts(hand)
  if (rank === 'fourKind' || rank === 'threeKind' || rank === 'twoPair') return holdWhere((x) => (c.get(x.rank) ?? 0) >= 2)

  // Four to a royal flush.
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
    const royal = hand.filter((x) => x.suit === suit && x.rank >= 10)
    if (royal.length === 4) return holdWhere((x) => x.suit === suit && x.rank >= 10)
  }
  if (rank === 'jacksOrBetter') return holdWhere((x) => (c.get(x.rank) ?? 0) === 2)

  // Four to a flush.
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
    if (hand.filter((x) => x.suit === suit).length === 4) return holdWhere((x) => x.suit === suit)
  }
  // Low pair.
  const pair = [...c.entries()].find(([, n]) => n === 2)
  if (pair) return holdWhere((x) => x.rank === pair[0])

  // Four to an open-ended straight.
  const uniq = [...new Set(hand.map((x) => x.rank))].sort((a, b) => a - b)
  for (let i = 0; i + 3 < uniq.length; i++) {
    const run = uniq.slice(i, i + 4)
    if (run[3] - run[0] === 3 && run[0] >= 2 && run[3] <= 13) {
      const used = new Set<number>()
      return hand.map((x) => (run.includes(x.rank) && !used.has(x.rank) ? (used.add(x.rank), true) : false))
    }
  }
  // Up to two high cards (Jack or better), preferring the lowest high cards.
  const highs = hand.filter((x) => x.rank >= 11).sort((a, b) => a.rank - b.rank).slice(0, 2)
  if (highs.length) return hand.map((x) => highs.includes(x))
  return none
}
