/**
 * XP & level curve. XP is earned per settled round (scaled by the square root
 * of the wager so small and large bettors both progress) and every level-up
 * pays a free chip reward.
 */

export const MAX_LEVEL = 99

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.floor(200 * Math.pow(level, 1.35))
}

/** Total XP required to reach `level` from level 1. */
export function totalXpForLevel(level: number): number {
  let total = 0
  for (let l = 1; l < level; l++) total += xpToNext(l)
  return total
}

export interface LevelInfo {
  level: number
  /** XP earned inside the current level. */
  into: number
  /** XP span of the current level. */
  span: number
  progress: number
  title: string
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, xp)
  while (level < MAX_LEVEL && remaining >= xpToNext(level)) {
    remaining -= xpToNext(level)
    level++
  }
  const span = xpToNext(level)
  return {
    level,
    into: remaining,
    span,
    progress: level >= MAX_LEVEL ? 1 : remaining / span,
    title: levelTitle(level),
  }
}

export function xpForRound(wager: number, won: boolean): number {
  const base = 5 + Math.floor(Math.sqrt(Math.max(0, wager)) * 2)
  return won ? Math.floor(base * 1.25) : base
}

export function levelUpReward(level: number): number {
  return 250 * level
}

const TITLES: [minLevel: number, title: string][] = [
  [1, 'Новичок'],
  [5, 'Завсегдатай'],
  [10, 'Картёжник'],
  [15, 'Хайроллер'],
  [20, 'ВИП-гость'],
  [30, 'Элита'],
  [40, 'Акула'],
  [50, 'Магнат'],
  [70, 'Легенда'],
  [90, 'Неоновый король'],
]

export function levelTitle(level: number): string {
  let title = TITLES[0][1]
  for (const [min, t] of TITLES) if (level >= min) title = t
  return title
}
