import { secureRandom, type Rng } from '../../lib/rng'

/*
 * «Авіатор: Посадка на крейсер» — a fully automatic flight.
 *
 * The jet takes off with a ×1 win counter and slowly loses height. Each
 * «step» of flight it may fly through a bonus: additive ones (+0,2× … +5×)
 * and rare multipliers (×2, ×3, ×5) raise the counter and toss the jet
 * upward — bigger bonuses toss it higher, so the flight lasts longer and can
 * meet more bonuses. Rockets halve the counter and knock it down. When the
 * jet reaches sea level it either lands on the carrier (the stake is paid
 * × counter) or misses it and falls into the sea (the stake is lost).
 *
 * Everything is drawn at take-off; the player only chooses the stake.
 * Long-run return: LAND_CHANCE × E[counter] ≈ 0.47 × 2.05 ≈ 96.5%.
 */

export const START_COUNTER = 1
/** Altitude at the end of take-off, in «steps» of descent. */
export const START_ALTITUDE = 4
export const MAX_COUNTER = 250
/** After this many steps no more bonuses appear and the jet glides down. */
export const MAX_STEPS = 60
/** Chance that the carrier is under the jet when it reaches sea level. */
export const LAND_CHANCE = 0.47

export type BonusKind = 'add' | 'mul' | 'rocket'

export interface BonusType {
  kind: BonusKind
  /** Added to the counter (`add`), multiplies it (`mul`) or divides it (`rocket`). */
  value: number
  /** Altitude change when hit: bigger bonuses toss the jet higher. */
  lift: number
  weight: number
}

/** Per-step outcome table; the remaining weight is an empty stretch of sky. */
export const BONUS_TABLE: readonly BonusType[] = [
  { kind: 'add', value: 0.2, lift: 0.8, weight: 15 },
  { kind: 'add', value: 0.5, lift: 1.1, weight: 10 },
  { kind: 'add', value: 1, lift: 1.5, weight: 5 },
  { kind: 'add', value: 2, lift: 2, weight: 1.8 },
  { kind: 'add', value: 5, lift: 2.6, weight: 0.5 },
  { kind: 'mul', value: 2, lift: 2.2, weight: 2.6 },
  { kind: 'mul', value: 3, lift: 2.6, weight: 0.5 },
  { kind: 'mul', value: 5, lift: 3, weight: 0.12 },
  { kind: 'rocket', value: 2, lift: -0.6, weight: 11.48 },
]
const EMPTY_WEIGHT = 53
const TOTAL_WEIGHT = EMPTY_WEIGHT + BONUS_TABLE.reduce((s, b) => s + b.weight, 0)

export interface FlightEvent {
  step: number
  bonus: BonusType
  /** Altitude where the jet meets the bonus (before the toss). */
  altitude: number
  counterBefore: number
  counterAfter: number
}

/** A bonus drawn in the sky that the jet flies past without touching. */
export interface Decoy {
  step: number
  bonus: BonusType
  altitude: number
}

export interface FlightPlan {
  events: FlightEvent[]
  decoys: Decoy[]
  /** Altitude at the start of every step flown (before that step's bonus). */
  altitudes: number[]
  /** Lift applied at the start of every step (0 when the sky was empty). */
  lifts: number[]
  /** Fractional step at which the jet reaches deck height. */
  touchdown: number
  counter: number
  landed: boolean
  /** Payout multiplier: the counter if landed, otherwise 0. */
  multiplier: number
}

const cents = (x: number) => Math.floor(x * 100 + 1e-9) / 100

export function applyBonus(counter: number, b: BonusType): number {
  let next = counter
  if (b.kind === 'add') next = counter + b.value
  else if (b.kind === 'mul') next = counter * b.value
  else next = Math.max(0.1, counter / b.value)
  return Math.min(MAX_COUNTER, cents(next))
}

function drawBonus(rng: Rng): BonusType | null {
  let r = rng() * TOTAL_WEIGHT - EMPTY_WEIGHT
  if (r < 0) return null
  for (const b of BONUS_TABLE) {
    r -= b.weight
    if (r < 0) return b
  }
  return BONUS_TABLE[BONUS_TABLE.length - 1]
}

/** The toss eases in over the first part of a step so the jet visibly bounces. */
const TOSS = 0.35
const easeOut = (u: number) => 1 - (1 - u) * (1 - u)

/** Altitude of the jet `u` ∈ [0, 1] of the way through a step. */
export function altitudeInStep(start: number, lift: number, u: number): number {
  return start + lift * easeOut(Math.min(1, u / TOSS)) - u
}

export function planFlight(rng: Rng = secureRandom): FlightPlan {
  const events: FlightEvent[] = []
  const decoys: Decoy[] = []
  const altitudes: number[] = []
  const lifts: number[] = []
  let counter = START_COUNTER
  let altitude = START_ALTITUDE
  let touchdown = 0

  for (let step = 0; ; step++) {
    altitudes.push(altitude)
    const bonus = step < MAX_STEPS ? drawBonus(rng) : null
    const lift = bonus?.lift ?? 0
    lifts.push(lift)
    if (bonus) {
      const before = counter
      counter = applyBonus(counter, bonus)
      events.push({ step, bonus, altitude, counterBefore: before, counterAfter: counter })
    } else if (step < MAX_STEPS && rng() < 0.45) {
      // Near misses keep the sky busy without touching the outcome.
      const pick = BONUS_TABLE[Math.floor(rng() * BONUS_TABLE.length)]
      const offset = (rng() < 0.5 ? -1 : 1) * (1.4 + rng() * 1.2)
      if (altitude + offset > 0.9) decoys.push({ step, bonus: pick, altitude: altitude + offset })
    }
    const end = altitude + lift - 1
    if (end <= 0) {
      // Find where this step's curve crosses deck height.
      let lo = 0
      let hi = 1
      if (altitudeInStep(altitude, lift, 0) <= 0) hi = 0
      for (let i = 0; i < 30 && hi > 0; i++) {
        const mid = (lo + hi) / 2
        if (altitudeInStep(altitude, lift, mid) > 0) lo = mid
        else hi = mid
      }
      touchdown = step + hi
      break
    }
    altitude = end
  }

  const landed = rng() < LAND_CHANCE
  return { events, decoys, altitudes, lifts, touchdown, counter, landed, multiplier: landed ? counter : 0 }
}

/** Jet altitude at fractional step `s` (clamped to deck height). */
export function altitudeAt(plan: FlightPlan, s: number): number {
  if (s <= 0) return plan.altitudes[0]
  if (s >= plan.touchdown) return 0
  const k = Math.min(plan.altitudes.length - 1, Math.floor(s))
  return Math.max(0, altitudeInStep(plan.altitudes[k], plan.lifts[k], s - k))
}

export function payoutFor(bet: number, plan: Pick<FlightPlan, 'multiplier'>): number {
  return Math.floor(bet * plan.multiplier)
}

/** «+0,2×», «×3», «÷2». */
export function bonusLabel(b: BonusType): string {
  const v = String(b.value).replace('.', ',')
  if (b.kind === 'add') return `+${v}×`
  if (b.kind === 'mul') return `×${v}`
  return `÷${v}`
}
