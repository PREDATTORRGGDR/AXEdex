import { describe, expect, it } from 'vitest'
import type { Rank } from '../../lib/cards'
import { seededRng } from '../../lib/rng'
import { drawCard, isCorrect, optionsFor } from './logic'

describe('hi-lo', () => {
  it('offers options whose chances match the rank', () => {
    const [hi, lo] = optionsFor(8)
    expect(hi.chance).toBeCloseTo(7 / 13)
    expect(lo.chance).toBeCloseTo(7 / 13)
    expect(optionsFor(2).map((o) => o.id)).toEqual(['higher', 'same'])
    expect(optionsFor(14).map((o) => o.id)).toEqual(['lower', 'same'])
  })

  it('keeps every step at ~97% expected return', () => {
    for (let r = 2; r <= 14; r++) {
      for (const o of optionsFor(r as Rank)) {
        const ev = o.chance * o.multiplier
        expect(ev).toBeGreaterThan(0.955)
        expect(ev).toBeLessThanOrEqual(0.97 + 1e-9)
      }
    }
  })

  it('judges guesses and draws uniformly', () => {
    expect(isCorrect('higherEq', 7, 7)).toBe(true)
    expect(isCorrect('lower', 7, 7)).toBe(false)
    expect(isCorrect('same', 14, 14)).toBe(true)
    const rng = seededRng(6)
    const counts = new Map<number, number>()
    for (let i = 0; i < 13_000; i++) {
      const c = drawCard(rng)
      counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1)
    }
    expect(counts.size).toBe(13)
    for (const v of counts.values()) expect(v).toBeGreaterThan(850)
  })
})
