/**
 * Randomness helpers. Everything defaults to the Web Crypto API so outcomes are
 * unbiased and unpredictable; logic modules accept an injectable `Rng` so tests
 * can run deterministically.
 */
export type Rng = () => number

const words = new Uint32Array(2)

/** Uniform float in [0, 1) with 53 bits of entropy from `crypto.getRandomValues`. */
export const secureRandom: Rng = () => {
  crypto.getRandomValues(words)
  // 27 high bits + 26 low bits = 53-bit mantissa.
  return ((words[0] >>> 5) * 67108864 + (words[1] >>> 6)) / 9007199254740992
}

/** Uniform integer in [0, maxExclusive). */
export function randomInt(maxExclusive: number, rng: Rng = secureRandom): number {
  return Math.floor(rng() * maxExclusive)
}

/** Fisher–Yates shuffle, returning a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = secureRandom): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, rng)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Picks an item with probability proportional to its weight. */
export function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: Rng = secureRandom): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]
    if (roll < 0) return items[i]
  }
  return items[items.length - 1]
}

/** Draws `count` distinct integers from [0, poolSize). */
export function sampleDistinct(poolSize: number, count: number, rng: Rng = secureRandom): number[] {
  const pool = Array.from({ length: poolSize }, (_, i) => i)
  for (let i = 0; i < count; i++) {
    const j = i + randomInt(poolSize - i, rng)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export function randomId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.floor(secureRandom() * 1e9).toString(36)}`
}

/** Deterministic PRNG (mulberry32) for tests and simulations. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
