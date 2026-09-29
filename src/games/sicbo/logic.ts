import { randomInt, secureRandom, type Rng } from '../../lib/rng'

export type SicBoRoll = [number, number, number]

export type SicBoBet =
  | 'small'
  | 'big'
  | 'odd'
  | 'even'
  | 'anyTriple'
  | `triple${1 | 2 | 3 | 4 | 5 | 6}`
  | `total${4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17}`
  | `single${1 | 2 | 3 | 4 | 5 | 6}`

/** Payout odds (X:1) for totals 4–17. */
export const TOTAL_ODDS: Record<number, number> = {
  4: 60, 5: 30, 6: 17, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 17, 16: 30, 17: 60,
}

export function rollThree(rng: Rng = secureRandom): SicBoRoll {
  return [randomInt(6, rng) + 1, randomInt(6, rng) + 1, randomInt(6, rng) + 1]
}

export const isTriple = (r: SicBoRoll) => r[0] === r[1] && r[1] === r[2]
export const sumOf3 = (r: SicBoRoll) => r[0] + r[1] + r[2]

/** Total return (stake included) for a single bet on this roll. */
export function sicBoPayout(bet: SicBoBet, stake: number, roll: SicBoRoll): number {
  const sum = sumOf3(roll)
  const triple = isTriple(roll)
  switch (bet) {
    case 'small':
      return !triple && sum >= 4 && sum <= 10 ? stake * 2 : 0
    case 'big':
      return !triple && sum >= 11 && sum <= 17 ? stake * 2 : 0
    case 'odd':
      return !triple && sum % 2 === 1 ? stake * 2 : 0
    case 'even':
      return !triple && sum % 2 === 0 ? stake * 2 : 0
    case 'anyTriple':
      return triple ? stake * 31 : 0
  }
  if (bet.startsWith('triple')) {
    const n = Number(bet.slice(6))
    return triple && roll[0] === n ? stake * 181 : 0
  }
  if (bet.startsWith('total')) {
    const n = Number(bet.slice(5))
    return sum === n ? stake * (TOTAL_ODDS[n] + 1) : 0
  }
  const n = Number(bet.slice(6))
  const hits = roll.filter((d) => d === n).length
  return hits ? stake * (1 + hits) : 0
}

export function betLabel(bet: SicBoBet): string {
  if (bet === 'small') return 'Малое'
  if (bet === 'big') return 'Большое'
  if (bet === 'odd') return 'Нечет'
  if (bet === 'even') return 'Чёт'
  if (bet === 'anyTriple') return 'Любая тройка'
  if (bet.startsWith('triple')) return `Тройка ${bet.slice(6)}`
  if (bet.startsWith('total')) return `Сумма ${bet.slice(5)}`
  return `Число ${bet.slice(6)}`
}
