import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { drawNumbers, hitChance, kenoRtp, MAX_PICKS, quickPick } from './logic'

describe('keno', () => {
  it('returns 94–97% for every pick count', () => {
    for (let k = 1; k <= MAX_PICKS; k++) {
      expect(kenoRtp(k)).toBeGreaterThan(0.94)
      expect(kenoRtp(k)).toBeLessThan(0.97)
    }
  })

  it('has hit probabilities that sum to one', () => {
    for (let k = 1; k <= MAX_PICKS; k++) {
      let total = 0
      for (let h = 0; h <= k; h++) total += hitChance(k, h)
      expect(total).toBeCloseTo(1, 10)
    }
  })

  it('draws ten distinct numbers in range', () => {
    const rng = seededRng(2)
    for (let i = 0; i < 500; i++) {
      const d = drawNumbers(rng)
      expect(new Set(d).size).toBe(10)
      expect(Math.min(...d)).toBeGreaterThanOrEqual(1)
      expect(Math.max(...d)).toBeLessThanOrEqual(40)
    }
    expect(quickPick(7, rng)).toHaveLength(7)
  })
})
