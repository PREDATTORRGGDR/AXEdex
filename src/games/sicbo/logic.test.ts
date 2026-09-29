import { describe, expect, it } from 'vitest'
import { sicBoPayout, TOTAL_ODDS, type SicBoRoll } from './logic'

const all: SicBoRoll[] = []
for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) all.push([a, b, c])
const ev = (bet: Parameters<typeof sicBoPayout>[0]) => all.reduce((s, r) => s + sicBoPayout(bet, 1, r), 0) / all.length

describe('sic bo', () => {
  it('loses small/big on triples', () => {
    expect(sicBoPayout('small', 10, [2, 2, 2])).toBe(0)
    expect(sicBoPayout('small', 10, [1, 2, 3])).toBe(20)
    expect(sicBoPayout('big', 10, [6, 6, 5])).toBe(20)
  })

  it('pays singles per occurrence and specific triples 180:1', () => {
    expect(sicBoPayout('single4', 10, [4, 4, 1])).toBe(30)
    expect(sicBoPayout('single4', 10, [4, 4, 4])).toBe(40)
    expect(sicBoPayout('triple6', 10, [6, 6, 6])).toBe(1810)
    expect(sicBoPayout('total4', 10, [1, 1, 2])).toBe(10 * (TOTAL_ODDS[4] + 1))
  })

  it('has the classic house edge on even-money bets', () => {
    expect(ev('small')).toBeCloseTo(0.9722, 3)
    expect(ev('odd')).toBeCloseTo(0.9722, 3)
    expect(ev('single3')).toBeCloseTo(0.9213, 3)
  })
})
