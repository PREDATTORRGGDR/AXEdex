import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { dropPath, multipliers, ROW_OPTIONS, rtp, slotOf, type Risk } from './logic'

const RISKS: Risk[] = ['low', 'medium', 'high']

describe('plinko tables', () => {
  it('has rows + 1 symmetric slots', () => {
    for (const rows of ROW_OPTIONS) {
      for (const risk of RISKS) {
        const t = multipliers(rows, risk)
        expect(t).toHaveLength(rows + 1)
        expect(t).toEqual([...t].reverse())
      }
    }
  })

  it('returns between 97% and 99.5%', () => {
    for (const rows of ROW_OPTIONS) {
      for (const risk of RISKS) {
        expect(rtp(rows, risk)).toBeGreaterThan(0.97)
        expect(rtp(rows, risk)).toBeLessThan(0.995)
      }
    }
  })

  it('gets riskier at the edges', () => {
    expect(multipliers(16, 'high')[0]).toBeGreaterThan(multipliers(16, 'low')[0])
    expect(multipliers(16, 'high')[8]).toBeLessThan(multipliers(16, 'low')[8])
  })
})

describe('plinko drops', () => {
  it('lands binomially around the centre', () => {
    const rng = seededRng(21)
    const counts = new Array(9).fill(0)
    for (let i = 0; i < 25_600; i++) counts[slotOf(dropPath(8, rng))]++
    expect(counts[4] / 25_600).toBeCloseTo(70 / 256, 1)
    expect(counts[0] + counts[8]).toBeLessThan(400)
  })
})
