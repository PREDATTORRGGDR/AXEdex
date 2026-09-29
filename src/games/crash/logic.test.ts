import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { crashPoint, multiplierAt, payoutFor, timeToReach } from './logic'

describe('crash', () => {
  it('never crashes below 1.00×', () => {
    const rng = seededRng(5)
    for (let i = 0; i < 10_000; i++) expect(crashPoint(rng)).toBeGreaterThanOrEqual(1)
  })

  it('returns ~97% for a fixed cash-out target', () => {
    const rng = seededRng(99)
    const n = 200_000
    for (const target of [1.5, 2, 5]) {
      let won = 0
      for (let i = 0; i < n; i++) if (crashPoint(rng) >= target) won += target
      expect(won / n).toBeGreaterThan(0.94)
      expect(won / n).toBeLessThan(1.0)
    }
  })

  it('grows exponentially and inverts cleanly', () => {
    expect(multiplierAt(0)).toBe(1)
    expect(multiplierAt(timeToReach(2) + 1)).toBeGreaterThanOrEqual(2)
    expect(multiplierAt(timeToReach(10) + 1)).toBeGreaterThanOrEqual(10)
    expect(multiplierAt(5000)).toBeGreaterThan(multiplierAt(4000))
  })

  it('floors payouts', () => {
    expect(payoutFor(100, 1.237)).toBe(123)
  })
})
