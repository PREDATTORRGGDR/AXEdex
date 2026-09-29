import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { altitudeAt, applyBonus, BONUS_TABLE, bonusLabel, LAND_CHANCE, MAX_COUNTER, payoutFor, planFlight, START_ALTITUDE } from './logic'

describe('carrier landing', () => {
  it('returns about 96–97% in the long run', () => {
    const rng = seededRng(2024)
    const n = 600_000
    let returned = 0
    let landed = 0
    for (let i = 0; i < n; i++) {
      const plan = planFlight(rng)
      returned += plan.multiplier
      if (plan.landed) landed++
    }
    expect(returned / n).toBeGreaterThan(0.93)
    expect(returned / n).toBeLessThan(0.99)
    expect(landed / n).toBeGreaterThan(LAND_CHANCE - 0.01)
    expect(landed / n).toBeLessThan(LAND_CHANCE + 0.01)
  })

  it('pays nothing when the jet misses the carrier', () => {
    const rng = seededRng(7)
    for (let i = 0; i < 2000; i++) {
      const plan = planFlight(rng)
      expect(plan.multiplier).toBe(plan.landed ? plan.counter : 0)
      expect(plan.counter).toBeGreaterThan(0)
      expect(plan.counter).toBeLessThanOrEqual(MAX_COUNTER)
    }
  })

  it('chains the counter through every bonus it hits', () => {
    const rng = seededRng(99)
    for (let i = 0; i < 2000; i++) {
      const plan = planFlight(rng)
      let c = 1
      for (const e of plan.events) {
        expect(e.counterBefore).toBe(c)
        c = applyBonus(c, e.bonus)
        expect(e.counterAfter).toBe(c)
      }
      expect(plan.counter).toBe(c)
    }
  })

  it('flies a continuous path that ends at deck height', () => {
    const rng = seededRng(5)
    for (let i = 0; i < 500; i++) {
      const plan = planFlight(rng)
      expect(altitudeAt(plan, 0)).toBe(START_ALTITUDE)
      expect(altitudeAt(plan, plan.touchdown)).toBe(0)
      for (let s = 0; s < plan.touchdown - 0.01; s += 0.05) {
        expect(Math.abs(altitudeAt(plan, s + 0.01) - altitudeAt(plan, s))).toBeLessThan(0.2)
      }
      // Every bonus is met while the jet is still in the air.
      for (const e of plan.events) expect(e.step).toBeLessThan(plan.touchdown)
    }
  })

  it('tosses the jet higher for bigger bonuses', () => {
    const adds = BONUS_TABLE.filter((b) => b.kind === 'add')
    for (let i = 1; i < adds.length; i++) expect(adds[i].lift).toBeGreaterThan(adds[i - 1].lift)
    expect(BONUS_TABLE.find((b) => b.kind === 'rocket')!.lift).toBeLessThan(0)
  })

  it('labels bonuses and floors payouts', () => {
    expect(bonusLabel({ kind: 'add', value: 0.5, lift: 1, weight: 1 })).toBe('+0,5×')
    expect(bonusLabel({ kind: 'mul', value: 3, lift: 1, weight: 1 })).toBe('×3')
    expect(bonusLabel({ kind: 'rocket', value: 2, lift: -1, weight: 1 })).toBe('÷2')
    expect(payoutFor(10, { multiplier: 2.57 })).toBe(25)
    expect(applyBonus(1, { kind: 'rocket', value: 2, lift: 0, weight: 0 })).toBe(0.5)
    expect(applyBonus(0.15, { kind: 'rocket', value: 2, lift: 0, weight: 0 })).toBe(0.1)
  })
})
