import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { colorOf, numbersFor, resolveSpin, returnMultiplier, spinNumber, straight, totalStake, WHEEL_ORDER } from './logic'

describe('roulette logic', () => {
  it('has every pocket exactly once on the wheel', () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i))
  })

  it('splits colors 18/18/1', () => {
    const colors = WHEEL_ORDER.map(colorOf)
    expect(colors.filter((c) => c === 'red')).toHaveLength(18)
    expect(colors.filter((c) => c === 'black')).toHaveLength(18)
    expect(colorOf(0)).toBe('green')
  })

  it('alternates red and black around the wheel', () => {
    for (let i = 1; i < WHEEL_ORDER.length - 1; i++) {
      expect(colorOf(WHEEL_ORDER[i])).not.toBe(colorOf(WHEEL_ORDER[i + 1]))
    }
  })

  it('pays standard odds', () => {
    expect(returnMultiplier(straight(17))).toBe(36)
    expect(returnMultiplier('dozen2')).toBe(3)
    expect(returnMultiplier('col1')).toBe(3)
    expect(returnMultiplier('red')).toBe(2)
    expect(numbersFor('col3')).toContain(36)
  })

  it('resolves mixed bets', () => {
    const bets = { red: 100, [straight(32)]: 10, dozen1: 50 } as const
    expect(totalStake(bets)).toBe(160)
    const hit = resolveSpin(bets, 32)
    expect(hit.payout).toBe(100 * 2 + 10 * 36)
    expect(hit.winningKeys.sort()).toEqual(['n32', 'red'])
  })

  it('zero loses all outside bets', () => {
    const bets = { red: 100, black: 100, even: 50, odd: 50, low: 20, high: 20, dozen1: 10, col1: 10 }
    expect(resolveSpin(bets, 0).payout).toBe(0)
    expect(resolveSpin({ [straight(0)]: 10 }, 0).payout).toBe(360)
  })

  it('has a 2.7% house edge on every bet', () => {
    // Expected return of any bet = (k/37) * (36/k) = 36/37.
    for (const key of ['red', 'dozen3', 'col2', straight(5)] as const) {
      const k = numbersFor(key).length
      expect((k / 37) * returnMultiplier(key)).toBeCloseTo(36 / 37, 10)
    }
  })

  it('spins uniformly', () => {
    const rng = seededRng(7)
    const counts = new Array(37).fill(0)
    for (let i = 0; i < 37_000; i++) counts[spinNumber(rng)]++
    for (const c of counts) expect(c).toBeGreaterThan(800)
  })
})
