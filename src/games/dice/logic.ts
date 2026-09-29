import { randomInt, secureRandom, type Rng } from '../../lib/rng'

export type Roll = [number, number]

export function rollDice(rng: Rng = secureRandom): Roll {
  return [randomInt(6, rng) + 1, randomInt(6, rng) + 1]
}

export const sumOf = (r: Roll) => r[0] + r[1]

/* ------------------------------ Больше / Меньше ----------------------------- */

export type HiLoPick = 'under' | 'seven' | 'over'

/** Total return multipliers (stake included). */
export const HILO_PAYOUT: Record<HiLoPick, number> = { under: 2.35, seven: 5.8, over: 2.35 }

export const HILO_LABELS: Record<HiLoPick, string> = { under: 'Меньше 7', seven: 'Ровно 7', over: 'Больше 7' }

/** Ways (out of 36) to roll each total. */
const WAYS = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]

export function hiloChance(pick: HiLoPick): number {
  let ways = 0
  for (let s = 2; s <= 12; s++) if (hiloWins(pick, s)) ways += WAYS[s]
  return ways / 36
}

export function hiloWins(pick: HiLoPick, sum: number): boolean {
  if (pick === 'under') return sum < 7
  if (pick === 'over') return sum > 7
  return sum === 7
}

/* -------------------------------- Крэпс-лайт -------------------------------- */

export type CrapsBet = 'pass' | 'dontpass'
export type CrapsResult = 'win' | 'lose' | 'push'

export const CRAPS_LABELS: Record<CrapsBet, string> = { pass: 'Пас', dontpass: 'Не пас' }

export interface CrapsRound {
  rolls: Roll[]
  point: number | null
  result: CrapsResult
}

/** Plays a Pass / Don't Pass bet from the come-out roll to resolution. */
export function playCraps(bet: CrapsBet, rng: Rng = secureRandom): CrapsRound {
  const first = rollDice(rng)
  const s = sumOf(first)
  const pass = bet === 'pass'
  if (s === 7 || s === 11) return { rolls: [first], point: null, result: pass ? 'win' : 'lose' }
  if (s === 2 || s === 3) return { rolls: [first], point: null, result: pass ? 'lose' : 'win' }
  if (s === 12) return { rolls: [first], point: null, result: pass ? 'lose' : 'push' }

  const rolls: Roll[] = [first]
  for (;;) {
    const r = rollDice(rng)
    rolls.push(r)
    const t = sumOf(r)
    if (t === s) return { rolls, point: s, result: pass ? 'win' : 'lose' }
    if (t === 7) return { rolls, point: s, result: pass ? 'lose' : 'win' }
  }
}

export function crapsPayout(bet: number, result: CrapsResult): number {
  return result === 'win' ? bet * 2 : result === 'push' ? bet : 0
}
