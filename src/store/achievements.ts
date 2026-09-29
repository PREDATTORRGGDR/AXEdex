import { GAME_IDS, type GameId } from '../games/ids'

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'

/** Tags a game can attach to a settled round to unlock special achievements. */
export type RoundTag =
  | 'bj-natural'
  | 'royal-flush'
  | 'roulette-straight'
  | 'slots-free-spins'
  | 'crash-10x'
  | 'mines-15'
  | 'plinko-edge'
  | 'wheel-jackpot'
  | 'keno-7'
  | 'craps-point'
  | 'hilo-10'

/** The subset of casino state achievements are evaluated against. */
export interface AchievementSnapshot {
  balance: number
  peakBalance: number
  rounds: number
  currentStreak: number
  bestStreak: number
  refills: number
  dailyStreak: number
  level: number
  gamesPlayed: GameId[]
}

export interface AchievementRound {
  wager: number
  net: number
  multiplier: number
  tags: readonly RoundTag[]
}

export interface AchievementDef {
  id: string
  title: string
  description: string
  tier: AchievementTier
  /** Free chips credited on unlock. */
  reward: number
  check: (s: AchievementSnapshot, round?: AchievementRound) => boolean
  progress?: (s: AchievementSnapshot) => [current: number, target: number]
}

const tagged = (tag: RoundTag) => (_: AchievementSnapshot, r?: AchievementRound) => !!r?.tags.includes(tag)

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'first-round',
    title: 'Добро пожаловать',
    description: 'Сыграйте первый раунд в любой игре.',
    tier: 'bronze',
    reward: 250,
    check: (s) => s.rounds >= 1,
    progress: (s) => [Math.min(s.rounds, 1), 1],
  },
  {
    id: 'grand-tour',
    title: 'Большое турне',
    description: `Сыграйте во все ${GAME_IDS.length} игр.`,
    tier: 'gold',
    reward: 5_000,
    check: (s) => s.gamesPlayed.length >= GAME_IDS.length,
    progress: (s) => [s.gamesPlayed.length, GAME_IDS.length],
  },
  {
    id: 'regular',
    title: 'Завсегдатай',
    description: 'Сыграйте 100 раундов.',
    tier: 'silver',
    reward: 1_500,
    check: (s) => s.rounds >= 100,
    progress: (s) => [Math.min(s.rounds, 100), 100],
  },
  {
    id: 'marathon',
    title: 'Марафонец',
    description: 'Сыграйте 1000 раундов.',
    tier: 'gold',
    reward: 10_000,
    check: (s) => s.rounds >= 1_000,
    progress: (s) => [Math.min(s.rounds, 1_000), 1_000],
  },
  {
    id: 'high-roller',
    title: 'Хайроллер',
    description: 'Поставьте 5000 фишек или больше за один раунд.',
    tier: 'silver',
    reward: 1_000,
    check: (_, r) => !!r && r.wager >= 5_000,
  },
  {
    id: 'big-winner',
    title: 'Крупный куш',
    description: 'Выиграйте 10 000 фишек чистыми за один раунд.',
    tier: 'gold',
    reward: 3_000,
    check: (_, r) => !!r && r.net >= 10_000,
  },
  {
    id: 'fifty-bagger',
    title: 'Полтинник',
    description: 'Получите выплату ×50 или больше.',
    tier: 'gold',
    reward: 3_000,
    check: (_, r) => !!r && r.multiplier >= 50,
  },
  {
    id: 'hot-streak',
    title: 'Горячая серия',
    description: 'Выиграйте 5 раундов подряд.',
    tier: 'silver',
    reward: 1_500,
    check: (s) => s.bestStreak >= 5,
    progress: (s) => [Math.min(s.bestStreak, 5), 5],
  },
  {
    id: 'on-fire',
    title: 'В огне',
    description: 'Выиграйте 10 раундов подряд.',
    tier: 'gold',
    reward: 5_000,
    check: (s) => s.bestStreak >= 10,
    progress: (s) => [Math.min(s.bestStreak, 10), 10],
  },
  {
    id: 'six-figures',
    title: 'Шестизначный',
    description: 'Доведите баланс до 100 000 фишек.',
    tier: 'gold',
    reward: 5_000,
    check: (s) => s.peakBalance >= 100_000,
    progress: (s) => [Math.min(s.peakBalance, 100_000), 100_000],
  },
  {
    id: 'millionaire',
    title: 'Фишечный миллионер',
    description: 'Доведите баланс до 1 000 000 фишек.',
    tier: 'platinum',
    reward: 25_000,
    check: (s) => s.peakBalance >= 1_000_000,
    progress: (s) => [Math.min(s.peakBalance, 1_000_000), 1_000_000],
  },
  {
    id: 'rising-star',
    title: 'Восходящая звезда',
    description: 'Достигните 10-го уровня.',
    tier: 'silver',
    reward: 2_000,
    check: (s) => s.level >= 10,
    progress: (s) => [Math.min(s.level, 10), 10],
  },
  {
    id: 'vip',
    title: 'ВИП-зал',
    description: 'Достигните 25-го уровня.',
    tier: 'platinum',
    reward: 10_000,
    check: (s) => s.level >= 25,
    progress: (s) => [Math.min(s.level, 25), 25],
  },
  {
    id: 'loyal',
    title: 'Верный гость',
    description: 'Забирайте ежедневный бонус 7 дней подряд.',
    tier: 'gold',
    reward: 5_000,
    check: (s) => s.dailyStreak >= 7,
    progress: (s) => [Math.min(s.dailyStreak, 7), 7],
  },
  {
    id: 'comeback',
    title: 'Второе дыхание',
    description: 'Опустошите баланс и возьмите бесплатное пополнение.',
    tier: 'bronze',
    reward: 500,
    check: (s) => s.refills >= 1,
  },
  {
    id: 'natural',
    title: 'Натуральный',
    description: 'Получите блэкджек с раздачи.',
    tier: 'bronze',
    reward: 500,
    check: tagged('bj-natural'),
  },
  {
    id: 'royal-flush',
    title: 'Королевская особа',
    description: 'Соберите роял-флеш в видеопокере.',
    tier: 'platinum',
    reward: 20_000,
    check: tagged('royal-flush'),
  },
  {
    id: 'straight-up',
    title: 'Точно в цель',
    description: 'Выиграйте ставку на одно число в рулетке.',
    tier: 'silver',
    reward: 1_000,
    check: tagged('roulette-straight'),
  },
  {
    id: 'bonus-round',
    title: 'Бонусный раунд',
    description: 'Запустите фриспины в Неон-слотах.',
    tier: 'silver',
    reward: 1_000,
    check: tagged('slots-free-spins'),
  },
  {
    id: 'to-the-moon',
    title: 'На Луну',
    description: 'Заберите выигрыш в «Ракете» на ×10 или выше.',
    tier: 'gold',
    reward: 2_500,
    check: tagged('crash-10x'),
  },
  {
    id: 'minefield',
    title: 'Сапёр',
    description: 'Откройте 15 безопасных клеток за один раунд «Мин».',
    tier: 'gold',
    reward: 2_500,
    check: tagged('mines-15'),
  },
  {
    id: 'edge-lord',
    title: 'На самом краю',
    description: 'Отправьте шарик Плинко в крайнюю лунку.',
    tier: 'gold',
    reward: 2_500,
    check: tagged('plinko-edge'),
  },
  {
    id: 'wheel-jackpot',
    title: 'Джекпот-сектор',
    description: 'Попадите в сектор джекпота на Колесе фортуны.',
    tier: 'gold',
    reward: 2_500,
    check: tagged('wheel-jackpot'),
  },
  {
    id: 'keno-oracle',
    title: 'Оракул Кено',
    description: 'Угадайте 7 или больше чисел в одном тираже Кено.',
    tier: 'gold',
    reward: 2_500,
    check: tagged('keno-7'),
  },
  {
    id: 'point-made',
    title: 'Пойнт взят',
    description: 'Выиграйте ставку «Пас» после установки пойнта в крэпсе.',
    tier: 'bronze',
    reward: 500,
    check: tagged('craps-point'),
  },
  {
    id: 'seer',
    title: 'Ясновидящий',
    description: 'Угадайте 10 карт подряд в «Выше-Ниже».',
    tier: 'gold',
    reward: 2_500,
    check: tagged('hilo-10'),
  },
]

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<
  string,
  AchievementDef
>

/** Returns the achievements newly satisfied by the snapshot (and optional round). */
export function findNewAchievements(
  unlocked: Record<string, number>,
  snapshot: AchievementSnapshot,
  round?: AchievementRound,
): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.check(snapshot, round))
}
