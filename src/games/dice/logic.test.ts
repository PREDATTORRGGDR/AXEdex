import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { crapsPayout, HILO_PAYOUT, hiloChance, hiloWins, playCraps, rollDice, sumOf } from './logic'

describe('dice hi-lo', () => {
  it('has correct odds and ~98% return', () => {
    expect(hiloChance('under')).toBeCloseTo(15 / 36)
    expect(hiloChance('seven')).toBeCloseTo(6 / 36)
    for (const pick of ['under', 'seven', 'over'] as const) {
      const ev = hiloChance(pick) * HILO_PAYOUT[pick]
      expect(ev).toBeGreaterThan(0.96)
      expect(ev).toBeLessThan(1)
    }
    expect(hiloWins('over', 8)).toBe(true)
    expect(hiloWins('over', 7)).toBe(false)
  })

  it('rolls fair dice', () => {
    const rng = seededRng(8)
    const counts = new Array(13).fill(0)
    for (let i = 0; i < 36_000; i++) counts[sumOf(rollDice(rng))]++
    expect(counts[7] / 36_000).toBeCloseTo(6 / 36, 1)
  })
})

describe('craps lite', () => {
  it('resolves every round and keeps the point', () => {
    const rng = seededRng(12)
    for (let i = 0; i < 2000; i++) {
      const r = playCraps('pass', rng)
      const last = sumOf(r.rolls[r.rolls.length - 1])
      if (r.point === null) expect(r.rolls).toHaveLength(1)
      else expect([7, r.point]).toContain(last)
    }
  })

  it('returns about 98.6% on the pass line', () => {
    const rng = seededRng(77)
    let paid = 0
    const n = 200_000
    for (let i = 0; i < n; i++) paid += crapsPayout(1, playCraps('pass', rng).result)
    expect(paid / n).toBeGreaterThan(0.975)
    expect(paid / n).toBeLessThan(0.995)
  })
})
