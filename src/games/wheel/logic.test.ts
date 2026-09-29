import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { rtp, segmentAngles, segmentsFor, spinWheel, type WheelRisk } from './logic'

const RISKS: WheelRisk[] = ['low', 'medium', 'high']

describe('fortune wheel', () => {
  it('returns about 96.5% at every risk level', () => {
    for (const r of RISKS) {
      expect(rtp(r)).toBeGreaterThan(0.955)
      expect(rtp(r)).toBeLessThan(0.975)
    }
  })

  it('covers the full circle', () => {
    for (const r of RISKS) {
      const a = segmentAngles(segmentsFor(r))
      expect(a[0].start).toBe(0)
      expect(a[a.length - 1].end).toBeCloseTo(360)
    }
  })

  it('lands on the jackpot about as often as its weight says', () => {
    const rng = seededRng(3)
    const segs = segmentsFor('high')
    const total = segs.reduce((s, x) => s + x.weight, 0)
    let hits = 0
    const n = 100_000
    for (let i = 0; i < n; i++) if (spinWheel('high', rng) === 0) hits++
    expect(hits / n).toBeCloseTo(segs[0].weight / total, 2)
  })
})
