import { secureRandom, type Rng } from '../../lib/rng'

export type Risk = 'low' | 'medium' | 'high'
export const ROW_OPTIONS = [8, 12, 16] as const
export type Rows = (typeof ROW_OPTIONS)[number]

export const RISK_LABELS: Record<Risk, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }

/** Half tables from the edge slot to the centre slot; mirrored to build the full row. */
const HALF: Record<Rows, Record<Risk, number[]>> = {
  8: {
    low: [5.5, 2, 1.1, 1, 0.5],
    medium: [14, 3, 1.3, 0.7, 0.35],
    high: [30, 4, 1.45, 0.3, 0.2],
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3],
    high: [170, 24, 8, 2, 0.7, 0.2, 0.2],
  },
  16: {
    low: [16, 9, 2, 1.4, 1.3, 1.2, 1.1, 1, 0.5],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3],
    high: [900, 120, 26, 9, 4, 2, 0.2, 0.2, 0.2],
  },
}

export function multipliers(rows: Rows, risk: Risk): number[] {
  const half = HALF[rows][risk]
  return [...half, ...half.slice(0, -1).reverse()]
}

/** Left/right decision at each row (true = right). */
export function dropPath(rows: number, rng: Rng = secureRandom): boolean[] {
  return Array.from({ length: rows }, () => rng() < 0.5)
}

export const slotOf = (path: readonly boolean[]) => path.filter(Boolean).length

function binomial(n: number, k: number): number {
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}

/** Exact theoretical return of a table. */
export function rtp(rows: Rows, risk: Risk): number {
  const table = multipliers(rows, risk)
  return table.reduce((sum, m, k) => sum + binomial(rows, k) * m, 0) / 2 ** rows
}
