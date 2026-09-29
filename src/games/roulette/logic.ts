import { randomInt, secureRandom, type Rng } from '../../lib/rng'

/** Pocket order on a single-zero European wheel, clockwise from zero. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26,
] as const

export const POCKETS = WHEEL_ORDER.length

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

export type PocketColor = 'red' | 'black' | 'green'

export function colorOf(n: number): PocketColor {
  if (n === 0) return 'green'
  return RED.has(n) ? 'red' : 'black'
}

export const COLOR_NAMES: Record<PocketColor, string> = { red: 'Красное', black: 'Чёрное', green: 'Зеро' }

export function describeNumber(n: number): string {
  return n === 0 ? 'Зеро' : `${COLOR_NAMES[colorOf(n)]} ${n}`
}

export type OutsideBet =
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high'
  | 'dozen1'
  | 'dozen2'
  | 'dozen3'
  | 'col1'
  | 'col2'
  | 'col3'

/** `n7` = straight-up bet on 7; everything else is an outside bet. */
export type BetKey = `n${number}` | OutsideBet

export type Bets = Partial<Record<BetKey, number>>

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const ALL = range(1, 36)

const OUTSIDE: Record<OutsideBet, number[]> = {
  red: ALL.filter((n) => RED.has(n)),
  black: ALL.filter((n) => !RED.has(n)),
  even: ALL.filter((n) => n % 2 === 0),
  odd: ALL.filter((n) => n % 2 === 1),
  low: range(1, 18),
  high: range(19, 36),
  dozen1: range(1, 12),
  dozen2: range(13, 24),
  dozen3: range(25, 36),
  col1: ALL.filter((n) => n % 3 === 1),
  col2: ALL.filter((n) => n % 3 === 2),
  col3: ALL.filter((n) => n % 3 === 0),
}

export const OUTSIDE_LABELS: Record<OutsideBet, string> = {
  red: 'Красное',
  black: 'Чёрное',
  even: 'Чёт',
  odd: 'Нечет',
  low: '1–18',
  high: '19–36',
  dozen1: '1-я дюжина',
  dozen2: '2-я дюжина',
  dozen3: '3-я дюжина',
  col1: '2 к 1',
  col2: '2 к 1',
  col3: '2 к 1',
}

export const straight = (n: number): BetKey => `n${n}`

/** Human-readable bet name (used for accessibility labels). */
export function betName(key: BetKey): string {
  if (isStraight(key)) return key === 'n0' ? 'Зеро' : `Число ${key.slice(1)}`
  if (key.startsWith('col')) return `Колонка ${key.slice(3)} (2 к 1)`
  return OUTSIDE_LABELS[key]
}

export function isStraight(key: BetKey): key is `n${number}` {
  return key.startsWith('n')
}

/** Numbers a bet covers. */
export function numbersFor(key: BetKey): number[] {
  return isStraight(key) ? [Number(key.slice(1))] : OUTSIDE[key]
}

/**
 * Total return multiplier (stake included). A bet covering k numbers pays
 * (36 / k − 1) : 1, so straight = 36×, dozens/columns = 3×, even-money = 2×.
 */
export function returnMultiplier(key: BetKey): number {
  return 36 / numbersFor(key).length
}

export function totalStake(bets: Bets): number {
  let sum = 0
  for (const v of Object.values(bets)) sum += v ?? 0
  return sum
}

export interface SpinResolution {
  payout: number
  winningKeys: BetKey[]
}

export function resolveSpin(bets: Bets, number: number): SpinResolution {
  let payout = 0
  const winningKeys: BetKey[] = []
  for (const [key, amount] of Object.entries(bets) as [BetKey, number][]) {
    if (!amount) continue
    if (numbersFor(key).includes(number)) {
      payout += amount * returnMultiplier(key)
      winningKeys.push(key)
    }
  }
  return { payout, winningKeys }
}

export function spinNumber(rng: Rng = secureRandom): number {
  return randomInt(POCKETS, rng)
}
