import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { dtPayout, dtValue, playDragonTiger } from './logic'

describe('dragon tiger', () => {
  it('treats the ace as low', () => {
    expect(dtValue(14)).toBe(1)
    expect(dtValue(13)).toBe(13)
  })

  it('pays 1:1, 11:1 and halves main bets on a tie', () => {
    expect(dtPayout('dragon', 100, 'dragon')).toBe(200)
    expect(dtPayout('tiger', 100, 'dragon')).toBe(0)
    expect(dtPayout('tie', 100, 'tie')).toBe(1200)
    expect(dtPayout('dragon', 100, 'tie')).toBe(50)
  })

  it('returns ~96% on dragon', () => {
    const rng = seededRng(4)
    let paid = 0
    const n = 100_000
    for (let i = 0; i < n; i++) paid += dtPayout('dragon', 100, playDragonTiger(rng).winner)
    expect(paid / (n * 100)).toBeGreaterThan(0.95)
    expect(paid / (n * 100)).toBeLessThan(0.975)
  })
})
