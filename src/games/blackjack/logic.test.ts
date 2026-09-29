import { describe, expect, it } from 'vitest'
import type { Card, Rank } from '../../lib/cards'
import { canDouble, canSplit, createShoe, dealerShouldHit, handTotal, isBlackjack, newHand, settleHand, SHOE_SIZE } from './logic'
import { seededRng } from '../../lib/rng'

let seq = 0
const c = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ id: String(seq++), rank, suit: 'spades' }))

describe('blackjack hand totals', () => {
  it('counts aces as 11 or 1', () => {
    expect(handTotal(c(14, 6))).toEqual({ total: 17, soft: true })
    expect(handTotal(c(14, 6, 10))).toEqual({ total: 17, soft: false })
    expect(handTotal(c(14, 14, 9))).toEqual({ total: 21, soft: true })
    expect(handTotal(c(13, 12))).toEqual({ total: 20, soft: false })
  })

  it('recognises naturals', () => {
    expect(isBlackjack(c(14, 13))).toBe(true)
    expect(isBlackjack(c(7, 7, 7))).toBe(false)
  })

  it('dealer stands on soft 17', () => {
    expect(dealerShouldHit(c(14, 6))).toBe(false)
    expect(dealerShouldHit(c(10, 6))).toBe(true)
    expect(dealerShouldHit(c(10, 7))).toBe(false)
  })
})

describe('blackjack actions', () => {
  it('allows splitting equal values only', () => {
    expect(canSplit(newHand(c(8, 8), 10), 1)).toBe(true)
    expect(canSplit(newHand(c(13, 10), 10), 1)).toBe(true)
    expect(canSplit(newHand(c(8, 9), 10), 1)).toBe(false)
    expect(canSplit(newHand(c(8, 8), 10), 4)).toBe(false)
    expect(canSplit(newHand(c(14, 14), 10, true, true), 2)).toBe(false)
  })

  it('allows doubling on two cards only', () => {
    expect(canDouble(newHand(c(5, 6), 10))).toBe(true)
    expect(canDouble(newHand(c(5, 6, 2), 10))).toBe(false)
  })
})

describe('blackjack settlement', () => {
  it('pays 3:2 for a natural', () => {
    expect(settleHand(newHand(c(14, 12), 100), c(10, 9))).toEqual({ outcome: 'blackjack', payout: 250 })
  })

  it('pushes natural vs natural', () => {
    expect(settleHand(newHand(c(14, 12), 100), c(14, 10))).toEqual({ outcome: 'push', payout: 100 })
  })

  it('split 21 is not a natural', () => {
    expect(settleHand(newHand(c(14, 12), 100, true), c(10, 9))).toEqual({ outcome: 'win', payout: 200 })
  })

  it('handles bust, dealer bust, compare and push', () => {
    expect(settleHand(newHand(c(10, 9, 5), 50), c(10, 6, 10)).outcome).toBe('bust')
    expect(settleHand(newHand(c(10, 2), 50), c(10, 6, 10))).toEqual({ outcome: 'win', payout: 100 })
    expect(settleHand(newHand(c(10, 8), 50), c(10, 9))).toEqual({ outcome: 'lose', payout: 0 })
    expect(settleHand(newHand(c(10, 8), 50), c(9, 9))).toEqual({ outcome: 'push', payout: 50 })
    expect(settleHand(newHand(c(10, 10), 50), c(14, 13)).outcome).toBe('lose')
  })
})

describe('shoe', () => {
  it('holds six full decks with unique ids', () => {
    const shoe = createShoe(seededRng(1))
    expect(shoe).toHaveLength(SHOE_SIZE)
    expect(new Set(shoe.map((x) => x.id)).size).toBe(SHOE_SIZE)
  })
})
