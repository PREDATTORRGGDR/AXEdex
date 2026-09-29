import { sampleDistinct, secureRandom, type Rng } from '../../lib/rng'

export type TowerLevel = 'easy' | 'medium' | 'hard' | 'expert'

export const TOWER_FLOORS = 8
export const TOWER_EDGE = 0.03

export const TOWER_LEVELS: Record<TowerLevel, { label: string; tiles: number; traps: number }> = {
  easy: { label: 'Лёгкая', tiles: 4, traps: 1 },
  medium: { label: 'Средняя', tiles: 3, traps: 1 },
  hard: { label: 'Сложная', tiles: 2, traps: 1 },
  expert: { label: 'Эксперт', tiles: 3, traps: 2 },
}

/** Cash-out multiplier after clearing `floors` floors. */
export function towerMultiplier(level: TowerLevel, floors: number): number {
  if (floors <= 0) return 1
  const { tiles, traps } = TOWER_LEVELS[level]
  const fair = Math.pow(tiles / (tiles - traps), floors)
  return Math.floor(fair * (1 - TOWER_EDGE) * 100) / 100
}

/** Trap positions for every floor (index 0 = ground floor). */
export function buildTower(level: TowerLevel, rng: Rng = secureRandom): number[][] {
  const { tiles, traps } = TOWER_LEVELS[level]
  return Array.from({ length: TOWER_FLOORS }, () => sampleDistinct(tiles, traps, rng))
}
