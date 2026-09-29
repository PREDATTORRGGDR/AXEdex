export const GAME_IDS = [
  'roulette',
  'blackjack',
  'slots',
  'crash',
  'plinko',
  'mines',
  'dice',
  'wheel',
  'poker',
  'keno',
  'hilo',
  'baccarat',
  'dragontiger',
  'sicbo',
  'limbo',
  'tower',
  'coinflip',
  'scratch',
] as const

export type GameId = (typeof GAME_IDS)[number]

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as readonly string[]).includes(value)
}
