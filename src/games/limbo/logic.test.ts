import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { COIN_STEP, coinMultiplier, flipCoin } from '../coinflip/logic'
import { buyTicket, scratchRtp } from '../scratch/logic'
import { buildTower, TOWER_FLOORS, TOWER_LEVELS, towerMultiplier } from '../tower/logic'
import { limboResult, targetForChance, winChance } from './logic'

describe('limbo', () => {
  it('wins with probability 0.97 / target', () => {
    const rng = seededRng(10)
    const n = 200_000
    for (const target of [2, 10]) {
      let wins = 0
      for (let i = 0; i < n; i++) if (limboResult(rng) >= target) wins++
      expect(wins / n).toBeCloseTo(winChance(target), 2)
    }
    expect(targetForChance(0.485)).toBe(2)
  })
})

describe('tower', () => {
  it('builds the right number of traps per floor', () => {
    const t = buildTower('expert', seededRng(1))
    expect(t).toHaveLength(TOWER_FLOORS)
    for (const floor of t) {
      expect(floor).toHaveLength(TOWER_LEVELS.expert.traps)
      expect(new Set(floor).size).toBe(floor.length)
    }
  })

  it('keeps a 3% edge at every height', () => {
    for (const level of ['easy', 'medium', 'hard', 'expert'] as const) {
      const { tiles, traps } = TOWER_LEVELS[level]
      for (let k = 1; k <= TOWER_FLOORS; k++) {
        const survive = Math.pow((tiles - traps) / tiles, k)
        expect(survive * towerMultiplier(level, k)).toBeCloseTo(0.97, 1)
      }
    }
  })
})

describe('coin flip', () => {
  it('compounds 1.94 per win and flips fairly', () => {
    expect(coinMultiplier(1)).toBe(COIN_STEP)
    expect(coinMultiplier(3)).toBe(7.3)
    const rng = seededRng(3)
    let heads = 0
    for (let i = 0; i < 20_000; i++) if (flipCoin(rng) === 'heads') heads++
    expect(heads / 20_000).toBeCloseTo(0.5, 1)
  })
})

describe('scratch card', () => {
  it('returns about 95.5% and never shows two winning lines', () => {
    expect(scratchRtp()).toBeCloseTo(0.955, 3)
    const rng = seededRng(8)
    let won = 0
    const n = 50_000
    for (let i = 0; i < n; i++) {
      const t = buyTicket(rng)
      expect(t.cells).toHaveLength(9)
      const counts = new Map<string, number>()
      for (const c of t.cells) counts.set(c, (counts.get(c) ?? 0) + 1)
      const triples = [...counts.values()].filter((v) => v >= 3)
      expect(triples.length).toBe(t.prize ? 1 : 0)
      if (t.prize) won += t.prize.multiplier
    }
    expect(won / n).toBeGreaterThan(0.9)
    expect(won / n).toBeLessThan(1.02)
  })
})
