import { describe, expect, it } from 'vitest'
import type { Card, Rank } from '../../lib/cards'
import { seededRng } from '../../lib/rng'
import { baccaratPayout, bankerDraws, playBaccarat, score } from './logic'

const c = (...ranks: Rank[]): Card[] => ranks.map((rank, i) => ({ id: `${i}-${rank}`, rank, suit: 'hearts' }))

describe('baccarat', () => {
  it('scores hands modulo ten', () => {
    expect(score(c(13, 9))).toBe(9)
    expect(score(c(7, 8))).toBe(5)
    expect(score(c(14, 12, 10))).toBe(1)
  })

  it('follows the banker drawing table', () => {
    expect(bankerDraws(3, c(8)[0])).toBe(false)
    expect(bankerDraws(3, c(9)[0])).toBe(true)
    expect(bankerDraws(6, c(7)[0])).toBe(true)
    expect(bankerDraws(6, null)).toBe(false)
    expect(bankerDraws(5, null)).toBe(true)
  })

  it('stands on naturals', () => {
    // Deal order P, B, P, B: player 9 (4+5), banker 3.
    const r = playBaccarat(undefined, c(4, 2, 5, 11, 7, 7))
    expect(r.player).toHaveLength(2)
    expect(r.banker).toHaveLength(2)
    expect(r.winner).toBe('player')
  })

  it('pays player 1:1, banker 0.95:1, tie 8:1 and pushes on ties', () => {
    expect(baccaratPayout('player', 100, 'player')).toBe(200)
    expect(baccaratPayout('banker', 100, 'banker')).toBe(195)
    expect(baccaratPayout('tie', 100, 'tie')).toBe(900)
    expect(baccaratPayout('banker', 100, 'tie')).toBe(100)
    expect(baccaratPayout('player', 100, 'banker')).toBe(0)
  })

  it('returns close to the textbook edge', () => {
    const rng = seededRng(17)
    let p = 0
    let b = 0
    const n = 60_000
    for (let i = 0; i < n; i++) {
      const w = playBaccarat(rng).winner
      p += baccaratPayout('player', 100, w)
      b += baccaratPayout('banker', 100, w)
    }
    expect(p / (n * 100)).toBeGreaterThan(0.97)
    expect(b / (n * 100)).toBeGreaterThan(0.97)
    expect(p / (n * 100)).toBeLessThan(1.005)
  })
})
