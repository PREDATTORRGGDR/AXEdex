import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/rng'
import { evaluateGrid, evaluateLine, LINES, PAYTABLE, playSpin, randomGrid, type Grid, type SymbolId } from './logic'

/** Builds a grid from rows (top, middle, bottom), each listing 5 reels. */
const fromRows = (rows: SymbolId[][]): Grid => [0, 1, 2, 3, 4].map((reel) => rows.map((row) => row[reel]))

const filler: SymbolId[] = ['lemon', 'grape', 'clover', 'bell', 'cherry']

describe('slots paylines', () => {
  it('pays five of a kind on the middle line', () => {
    const grid = fromRows([filler, ['seven', 'seven', 'seven', 'seven', 'seven'], ['cherry', 'lemon', 'grape', 'clover', 'bell']])
    const win = evaluateLine(grid, 0, 2)
    expect(win).toMatchObject({ symbol: 'seven', count: 5, win: PAYTABLE.seven[2] * 2 })
  })

  it('lets wilds substitute from any position', () => {
    const grid = fromRows([filler, ['wild', 'bell', 'wild', 'bell', 'grape'], ['cherry', 'lemon', 'grape', 'clover', 'bell']])
    expect(evaluateLine(grid, 0, 1)).toMatchObject({ symbol: 'bell', count: 4, win: PAYTABLE.bell[1] })
  })

  it('prefers the bigger of a wild line and a symbol line', () => {
    const grid = fromRows([filler, ['wild', 'wild', 'wild', 'cherry', 'grape'], ['cherry', 'lemon', 'grape', 'clover', 'bell']])
    const win = evaluateLine(grid, 0, 1)!
    expect(win.symbol).toBe('wild')
    expect(win.win).toBe(Math.max(PAYTABLE.wild[0], PAYTABLE.cherry[1]))
  })

  it('breaks lines on scatters and needs three in a row', () => {
    const grid = fromRows([filler, ['bell', 'bell', 'scatter', 'bell', 'bell'], ['cherry', 'lemon', 'grape', 'clover', 'bell']])
    expect(evaluateLine(grid, 0, 1)).toBeNull()
  })
})

describe('scatters and free spins', () => {
  it('pays scatters anywhere and awards free spins', () => {
    const grid = fromRows([
      ['scatter', 'lemon', 'grape', 'clover', 'scatter'],
      ['lemon', 'grape', 'scatter', 'bell', 'cherry'],
      ['cherry', 'clover', 'lemon', 'gem', 'crown'],
    ])
    const out = evaluateGrid(grid, 1)
    expect(out.scatterCells).toHaveLength(3)
    expect(out.scatterWin).toBe(2 * LINES)
    expect(out.freeSpinsAwarded).toBe(10)
  })

  it('never places two scatters on one reel', () => {
    const rng = seededRng(3)
    for (let i = 0; i < 2000; i++) {
      for (const reel of randomGrid(rng)) expect(reel.filter((s) => s === 'scatter').length).toBeLessThanOrEqual(1)
    }
  })

  it('plays out triggered free spins with a multiplier', () => {
    const rng = seededRng(11)
    let found = false
    for (let i = 0; i < 5000 && !found; i++) {
      const seq = playSpin(1, rng)
      if (seq.freeSpins.length) {
        found = true
        expect(seq.freeSpins.length).toBeGreaterThanOrEqual(10)
        expect(seq.freeSpins.every((s) => s.multiplier === 2)).toBe(true)
        expect(seq.totalWin).toBe(seq.base.win + seq.freeSpins.reduce((a, s) => a + s.win, 0))
      }
    }
    expect(found).toBe(true)
  })
})
