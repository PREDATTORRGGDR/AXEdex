import { describe, expect, it } from 'vitest'
import type { Card, Rank, Suit } from '../../lib/cards'
import { deal, draw, evaluateHand, payPerCoin, suggestHolds } from './logic'

const S: Record<string, Suit> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }
const R: Record<string, Rank> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14 }
const hand = (s: string): Card[] => s.split(' ').map((t, i) => ({ id: String(i) + t, rank: R[t[0]], suit: S[t[1]] }))

describe('video poker hands', () => {
  it('ranks every paying hand', () => {
    expect(evaluateHand(hand('Ts Js Qs Ks As'))).toBe('royal')
    expect(evaluateHand(hand('5h 6h 7h 8h 9h'))).toBe('straightFlush')
    expect(evaluateHand(hand('9c 9d 9h 9s 2c'))).toBe('fourKind')
    expect(evaluateHand(hand('3c 3d 3h 8s 8c'))).toBe('fullHouse')
    expect(evaluateHand(hand('2d 7d 9d Jd Kd'))).toBe('flush')
    expect(evaluateHand(hand('Ac 2d 3h 4s 5c'))).toBe('straight')
    expect(evaluateHand(hand('Tc Jd Qh Ks Ac'))).toBe('straight')
    expect(evaluateHand(hand('7c 7d 7h Ks 2c'))).toBe('threeKind')
    expect(evaluateHand(hand('4c 4d Jh Js 2c'))).toBe('twoPair')
    expect(evaluateHand(hand('Qc Qd 5h 8s 2c'))).toBe('jacksOrBetter')
    expect(evaluateHand(hand('Tc Td 5h 8s 2c'))).toBeNull()
    expect(evaluateHand(hand('2c 5d 9h Js Kc'))).toBeNull()
  })

  it('boosts the royal at max coins', () => {
    expect(payPerCoin('royal', 5)).toBe(800)
    expect(payPerCoin('royal', 4)).toBe(250)
    expect(payPerCoin('flush', 5)).toBe(6)
  })

  it('draws replacements only for discarded cards', () => {
    const d = deal()
    const held = [true, false, true, false, false]
    const next = draw(d.hand, held, d.deck)
    expect(next[0]).toBe(d.hand[0])
    expect(next[2]).toBe(d.hand[2])
    expect(next[1]).toBe(d.deck[0])
    expect(next[4]).toBe(d.deck[2])
  })

  it('gives sensible hold advice', () => {
    expect(suggestHolds(hand('Qc Qd 5h 8s 2c'))).toEqual([true, true, false, false, false])
    expect(suggestHolds(hand('Ts Js Qs Ks 2c'))).toEqual([true, true, true, true, false])
    expect(suggestHolds(hand('2d 7d 9d Jd 4c'))).toEqual([true, true, true, true, false])
    expect(suggestHolds(hand('2c 5d 9h 3s 7c'))).toEqual([false, false, false, false, false])
  })
})
