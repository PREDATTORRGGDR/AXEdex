import type { IconName } from '../components/ui/iconNames'
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
  | 'baccarat-tie'
  | 'sicbo-triple'
  | 'limbo-100'
  | 'tower-top'
  | 'coin-5'
  | 'scratch-top'

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
  icon: IconName
  /** Free chips credited on unlock. */
  reward: number
  check: (s: AchievementSnapshot, round?: AchievementRound) => boolean
  progress?: (s: AchievementSnapshot) => [current: number, target: number]
}

const tagged = (tag: RoundTag) => (_: AchievementSnapshot, r?: AchievementRound) => !!r?.tags.includes(tag)

const DEFS: readonly Omit<AchievementDef, 'reward'>[] = [
  {
    id: 'first-round',
    icon: 'party-popper',
    title: 'Ласкаво просимо',
    description: 'Зіграйте перший раунд у будь-якій грі.',
    tier: 'bronze',
    check: (s) => s.rounds >= 1,
    progress: (s) => [Math.min(s.rounds, 1), 1],
  },
  {
    id: 'grand-tour',
    icon: 'world-map',
    title: 'Великий тур',
    description: `Зіграйте в усі ${GAME_IDS.length} ігор.`,
    tier: 'gold',
    check: (s) => s.gamesPlayed.length >= GAME_IDS.length,
    progress: (s) => [s.gamesPlayed.length, GAME_IDS.length],
  },
  {
    id: 'regular',
    icon: 'tear-off-calendar',
    title: 'Завсідник',
    description: 'Зіграйте 100 раундів.',
    tier: 'silver',
    check: (s) => s.rounds >= 100,
    progress: (s) => [Math.min(s.rounds, 100), 100],
  },
  {
    id: 'marathon',
    icon: 'person-running',
    title: 'Марафонець',
    description: 'Зіграйте 1000 раундів.',
    tier: 'gold',
    check: (s) => s.rounds >= 1_000,
    progress: (s) => [Math.min(s.rounds, 1_000), 1_000],
  },
  {
    id: 'high-roller',
    icon: 'money-bag',
    title: 'Хайролер',
    description: 'Поставте 1000 фішок або більше за один раунд.',
    tier: 'silver',
    check: (_, r) => !!r && r.wager >= 1_000,
  },
  {
    id: 'big-winner',
    icon: 'trophy',
    title: 'Великий куш',
    description: 'Виграйте 2500 фішок чистими за один раунд.',
    tier: 'gold',
    check: (_, r) => !!r && r.net >= 2_500,
  },
  {
    id: 'fifty-bagger',
    icon: 'hundred-points',
    title: 'П’ятдесятка',
    description: 'Отримайте виплату ×50 або більше.',
    tier: 'gold',
    check: (_, r) => !!r && r.multiplier >= 50,
  },
  {
    id: 'hot-streak',
    icon: 'fire',
    title: 'Гаряча серія',
    description: 'Виграйте 5 раундів поспіль.',
    tier: 'silver',
    check: (s) => s.bestStreak >= 5,
    progress: (s) => [Math.min(s.bestStreak, 5), 5],
  },
  {
    id: 'on-fire',
    icon: 'comet',
    title: 'У вогні',
    description: 'Виграйте 10 раундів поспіль.',
    tier: 'gold',
    check: (s) => s.bestStreak >= 10,
    progress: (s) => [Math.min(s.bestStreak, 10), 10],
  },
  {
    id: 'six-figures',
    icon: 'gem-stone',
    title: 'П’ять знаків',
    description: 'Доведіть баланс до 10 000 фішок.',
    tier: 'gold',
    check: (s) => s.peakBalance >= 10_000,
    progress: (s) => [Math.min(s.peakBalance, 10_000), 10_000],
  },
  {
    id: 'millionaire',
    icon: 'crown',
    title: 'Шість знаків',
    description: 'Доведіть баланс до 100 000 фішок.',
    tier: 'platinum',
    check: (s) => s.peakBalance >= 100_000,
    progress: (s) => [Math.min(s.peakBalance, 100_000), 100_000],
  },
  {
    id: 'rising-star',
    icon: 'glowing-star',
    title: 'Висхідна зірка',
    description: 'Досягніть 10-го рівня.',
    tier: 'silver',
    check: (s) => s.level >= 10,
    progress: (s) => [Math.min(s.level, 10), 10],
  },
  {
    id: 'vip',
    icon: 'top-hat',
    title: 'VIP-зала',
    description: 'Досягніть 25-го рівня.',
    tier: 'platinum',
    check: (s) => s.level >= 25,
    progress: (s) => [Math.min(s.level, 25), 25],
  },
  {
    id: 'loyal',
    icon: 'spiral-calendar',
    title: 'Вірний гість',
    description: 'Забирайте щоденний бонус 7 днів поспіль.',
    tier: 'gold',
    check: (s) => s.dailyStreak >= 7,
    progress: (s) => [Math.min(s.dailyStreak, 7), 7],
  },
  {
    id: 'comeback',
    icon: 'flexed-biceps',
    title: 'Друге дихання',
    description: 'Збанкрутуйте й отримайте допомогу банку.',
    tier: 'bronze',
    check: (s) => s.refills >= 1,
  },
  {
    id: 'natural',
    icon: 'spade-suit',
    title: 'Натуральний',
    description: 'Отримайте блекджек з роздачі.',
    tier: 'bronze',
    check: tagged('bj-natural'),
  },
  {
    id: 'royal-flush',
    icon: 'laurels-trophy',
    title: 'Королівська особа',
    description: 'Зберіть роял-флеш у відеопокері.',
    tier: 'platinum',
    check: tagged('royal-flush'),
  },
  {
    id: 'straight-up',
    icon: 'roulette',
    title: 'Точно в ціль',
    description: 'Виграйте ставку на одне число в рулетці.',
    tier: 'silver',
    check: tagged('roulette-straight'),
  },
  {
    id: 'bonus-round',
    icon: 'slot-machine',
    title: 'Бонусний раунд',
    description: 'Запустіть фриспіни в Неон-слотах.',
    tier: 'silver',
    check: tagged('slots-free-spins'),
  },
  {
    id: 'to-the-moon',
    icon: 'crescent-moon',
    title: 'На Місяць',
    description: 'Заберіть виграш у «Ракеті» на ×10 або вище.',
    tier: 'gold',
    check: tagged('crash-10x'),
  },
  {
    id: 'minefield',
    icon: 'bomb',
    title: 'Сапер',
    description: 'Відкрийте 15 безпечних клітинок за один раунд «Мін».',
    tier: 'gold',
    check: tagged('mines-15'),
  },
  {
    id: 'edge-lord',
    icon: 'plinko',
    title: 'На самому краю',
    description: 'Відправте кульку Плінко в крайню лунку.',
    tier: 'gold',
    check: tagged('plinko-edge'),
  },
  {
    id: 'wheel-jackpot',
    icon: 'diamond-trophy',
    title: 'Джекпот-сектор',
    description: 'Влучте в сектор джекпоту на Колесі фортуни.',
    tier: 'gold',
    check: tagged('wheel-jackpot'),
  },
  {
    id: 'keno-oracle',
    icon: 'crystal-ball',
    title: 'Оракул Кено',
    description: 'Вгадайте 7 або більше чисел в одному тиражі Кено.',
    tier: 'gold',
    check: tagged('keno-7'),
  },
  {
    id: 'point-made',
    icon: 'game-die',
    title: 'Пойнт узято',
    description: 'Виграйте ставку «Пас» після встановлення пойнта в крепсі.',
    tier: 'bronze',
    check: tagged('craps-point'),
  },
  {
    id: 'seer',
    icon: 'person-mage',
    title: 'Ясновидець',
    description: 'Вгадайте 10 карт поспіль у «Вище-Нижче».',
    tier: 'gold',
    check: tagged('hilo-10'),
  },
  {
    id: 'baccarat-tie',
    icon: 'diamond-suit',
    title: 'Рівновага',
    description: 'Виграйте ставку на нічию в бакара.',
    tier: 'silver',
    check: tagged('baccarat-tie'),
  },
  {
    id: 'sicbo-triple',
    icon: 'sic-bo',
    title: 'Потрійний удар',
    description: 'Вгадайте конкретну трійку в сік-бо.',
    tier: 'platinum',
    check: tagged('sicbo-triple'),
  },
  {
    id: 'limbo-100',
    icon: 'bullseye',
    title: 'Снайпер',
    description: 'Виграйте в «Лімбо» з ціллю ×100 або вище.',
    tier: 'gold',
    check: tagged('limbo-100'),
  },
  {
    id: 'tower-top',
    icon: 'castle',
    title: 'Підкорювач вежі',
    description: 'Доберіться до вершини «Вежі».',
    tier: 'gold',
    check: tagged('tower-top'),
  },
  {
    id: 'coin-5',
    icon: 'coin',
    title: 'П’ять із п’яти',
    description: 'Вгадайте 5 кидків монетки поспіль і заберіть виграш.',
    tier: 'silver',
    check: tagged('coin-5'),
  },
  {
    id: 'scratch-top',
    icon: 'crown',
    title: 'Щасливий квиток',
    description: 'Знайдіть три корони на скретч-картці.',
    tier: 'platinum',
    check: tagged('scratch-top'),
  },
]

/** Chip rewards stay small on purpose: they are a pat on the back, not a salary. */
export const TIER_REWARD: Record<AchievementTier, number> = { bronze: 50, silver: 150, gold: 500, platinum: 1_500 }

export const ACHIEVEMENTS: readonly AchievementDef[] = DEFS.map((a) => ({ ...a, reward: TIER_REWARD[a.tier] }))

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
