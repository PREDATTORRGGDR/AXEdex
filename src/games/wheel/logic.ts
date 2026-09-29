import { secureRandom, type Rng } from '../../lib/rng'

export type WheelRisk = 'low' | 'medium' | 'high'

export const WHEEL_RISK_LABELS: Record<WheelRisk, string> = { low: 'Низький', medium: 'Середній', high: 'Високий' }

export interface Segment {
  multiplier: number
  /** Relative size; the arc drawn on the wheel is proportional to it. */
  weight: number
  jackpot?: boolean
}

const JACKPOT: Record<WheelRisk, { multiplier: number; weight: number }> = {
  low: { multiplier: 10, weight: 0.5 },
  medium: { multiplier: 25, weight: 0.4 },
  high: { multiplier: 50, weight: 0.285 },
}

/** Regular segments clockwise from the jackpot wedge. */
const PATTERNS: Record<WheelRisk, number[]> = {
  low: [1.2, 0, 1.5, 1.2, 0, 1.2, 0, 1.5, 1.2, 0, 1.2, 0, 1.2, 1.5, 0, 1.2, 1.5, 0, 1.2, 0, 1.2, 1.5, 0, 1.2, 0, 1.2, 1.5, 0, 1.2],
  medium: [0, 1.5, 0, 0, 2, 0, 0, 1.5, 0, 0, 3, 0, 0, 1.5, 0, 0, 1.5, 0, 0, 2, 0, 0, 4, 0, 0, 1.5, 0, 0, 0],
  high: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 2, 0, 0, 0],
}

export function segmentsFor(risk: WheelRisk): Segment[] {
  const jp = JACKPOT[risk]
  return [{ multiplier: jp.multiplier, weight: jp.weight, jackpot: true }, ...PATTERNS[risk].map((m) => ({ multiplier: m, weight: 1 }))]
}

export function rtp(risk: WheelRisk): number {
  const segs = segmentsFor(risk)
  const total = segs.reduce((s, x) => s + x.weight, 0)
  return segs.reduce((s, x) => s + x.multiplier * x.weight, 0) / total
}

/** Picks a segment index with probability proportional to its weight. */
export function spinWheel(risk: WheelRisk, rng: Rng = secureRandom): number {
  const segs = segmentsFor(risk)
  const total = segs.reduce((s, x) => s + x.weight, 0)
  let r = rng() * total
  for (let i = 0; i < segs.length; i++) {
    r -= segs[i].weight
    if (r < 0) return i
  }
  return segs.length - 1
}

/** Start/end angle (degrees, clockwise from 12 o'clock) of every segment. */
export function segmentAngles(segs: Segment[]): { start: number; end: number }[] {
  const total = segs.reduce((s, x) => s + x.weight, 0)
  let acc = 0
  return segs.map((s) => {
    const start = (acc / total) * 360
    acc += s.weight
    return { start, end: (acc / total) * 360 }
  })
}
