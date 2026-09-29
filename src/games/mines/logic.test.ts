import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { multiplierFor, nextSafeChance, placeMines, TILES } from './logic'

describe('mines', () => {
  it('compounds the multiplier with each safe tile', () => {
    expect(multiplierFor(3, 0)).toBe(1)
    expect(multiplierFor(1, 1)).toBe(1.01)
    expect(multiplierFor(24, 1)).toBe(24.25)
    for (let k = 1; k < 20; k++) expect(multiplierFor(5, k + 1)).toBeGreaterThan(multiplierFor(5, k))
  })

  it('keeps a 3% edge on every step', () => {
    for (const mines of [1, 3, 10]) {
      for (let k = 1; k <= 5; k++) {
        let survive = 1
        for (let i = 0; i < k; i++) survive *= nextSafeChance(mines, i)
        expect(survive * multiplierFor(mines, k)).toBeCloseTo(0.97, 1)
      }
    }
  })

  it('places distinct mines inside the board', () => {
    const rng = seededRng(4)
    for (let i = 0; i < 200; i++) {
      const mines = placeMines(7, rng)
      expect(new Set(mines).size).toBe(7)
      expect(Math.max(...mines)).toBeLessThan(TILES)
    }
  })
})
