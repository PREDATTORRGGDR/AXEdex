import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GAME_IDS, type GameId } from '../games/ids'
import { randomId } from '../lib/rng'
import { findNewAchievements, type AchievementDef, type AchievementSnapshot, type RoundTag } from './achievements'
import { levelFromXp, levelUpReward, xpForRound } from './progression'
import { persistStorage, STORAGE_PREFIX } from './storage'
import { toast } from './toasts'

/* ------------------------------------------------------------------ */
/* Economy constants: all chips are free, virtual and worthless.       */
/* ------------------------------------------------------------------ */
export const STARTING_BALANCE = 10_000
/** A free refill tops the balance back up to this amount. */
export const REFILL_TARGET = 10_000
/** Refills unlock once the balance drops below this. */
export const REFILL_THRESHOLD = 100
export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000
/** Claiming within this window of the previous claim keeps the streak alive. */
export const DAILY_STREAK_WINDOW_MS = 48 * 60 * 60 * 1000
export const DAILY_MAX_STREAK = 7

export const FAUCET_COOLDOWN_MS = 60 * 60 * 1000

export function faucetAmount(level: number): number {
  return 500 + 100 * Math.min(Math.max(level, 1) - 1, 20)
}

export function dailyBonusAmount(streakDay: number): number {
  const day = Math.min(Math.max(streakDay, 1), DAILY_MAX_STREAK)
  return 1_000 + (day - 1) * 500
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

/** How a round ends: the total chips returned to the player (stake included). */
export interface Settlement {
  payout: number
  tags?: RoundTag[]
  /** Short human summary, e.g. "Red 32" or "Blackjack!". */
  detail?: string
}

/**
 * A round whose wager has been debited but not settled. Games that know the
 * outcome up front (roulette, slots, ...) store it as `fallback`, so a round
 * interrupted by navigation or a reload still settles fairly on next launch.
 */
export interface OpenRound {
  id: string
  game: GameId
  wager: number
  startedAt: number
  fallback?: Settlement
}

export interface RoundRecord {
  id: string
  game: GameId
  wager: number
  payout: number
  net: number
  multiplier: number
  detail?: string
  at: number
}

export interface GameStats {
  rounds: number
  wins: number
  losses: number
  pushes: number
  wagered: number
  returned: number
  biggestWin: number
  bestMultiplier: number
  lastPlayedAt: number
}

export interface LifetimeStats extends GameStats {
  currentStreak: number
  bestStreak: number
  peakBalance: number
  refills: number
  dailyClaims: number
  faucetClaims: number
  /** Free chips received from achievements and level-ups. */
  rewardChips: number
}

export interface BalancePoint {
  at: number
  balance: number
}

export interface Settings {
  sound: boolean
  volume: number
  haptics: boolean
}

export interface DailyState {
  lastClaimAt: number | null
  streak: number
}

interface CasinoData {
  balance: number
  xp: number
  faucetLastClaimAt: number | null
  favorites: GameId[]
  openRounds: OpenRound[]
  lifetime: LifetimeStats
  games: Partial<Record<GameId, GameStats>>
  recent: RoundRecord[]
  balanceHistory: BalancePoint[]
  daily: DailyState
  achievements: Record<string, number>
  settings: Settings
}

interface CasinoActions {
  /** Debits `wager` and opens a round. Returns the round id, or null if the balance is short. */
  startRound: (game: GameId, wager: number, fallback?: Settlement) => string | null
  /** Adds to an open round's wager (double down, split, insurance...). */
  raiseRound: (id: string, extra: number) => boolean
  /** Updates the settlement used if the round is interrupted. */
  setRoundFallback: (id: string, fallback: Settlement) => void
  /** Credits the payout and records stats. Uses the stored fallback when `settlement` is omitted. */
  finishRound: (id: string, settlement?: Settlement) => RoundRecord | null
  /** Refunds a round without recording it (used for orphaned rounds). */
  cancelRound: (id: string) => void
  /** Settles every open round that carries a fallback. Runs on app start. */
  recoverRounds: () => void
  claimDailyBonus: (now?: number) => number
  claimFaucet: (now?: number) => number
  claimRefill: () => number
  toggleFavorite: (game: GameId) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetProgress: () => void
}

export type CasinoState = CasinoData & CasinoActions

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const MAX_RECENT = 40
const MAX_HISTORY = 120

export const emptyGameStats = (): GameStats => ({
  rounds: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  wagered: 0,
  returned: 0,
  biggestWin: 0,
  bestMultiplier: 0,
  lastPlayedAt: 0,
})

const initialData = (): CasinoData => ({
  balance: STARTING_BALANCE,
  xp: 0,
  faucetLastClaimAt: null,
  favorites: [],
  openRounds: [],
  lifetime: {
    ...emptyGameStats(),
    currentStreak: 0,
    bestStreak: 0,
    peakBalance: STARTING_BALANCE,
    refills: 0,
    dailyClaims: 0,
    faucetClaims: 0,
    rewardChips: 0,
  },
  games: {},
  recent: [],
  balanceHistory: [{ at: Date.now(), balance: STARTING_BALANCE }],
  daily: { lastClaimAt: null, streak: 0 },
  achievements: {},
  settings: { sound: true, volume: 0.7, haptics: true },
})

function applyRound(stats: GameStats, rec: RoundRecord): GameStats {
  return {
    rounds: stats.rounds + 1,
    wins: stats.wins + (rec.net > 0 ? 1 : 0),
    losses: stats.losses + (rec.net < 0 ? 1 : 0),
    pushes: stats.pushes + (rec.net === 0 ? 1 : 0),
    wagered: stats.wagered + rec.wager,
    returned: stats.returned + rec.payout,
    biggestWin: Math.max(stats.biggestWin, rec.net),
    bestMultiplier: Math.max(stats.bestMultiplier, rec.multiplier),
    lastPlayedAt: rec.at,
  }
}

const pushHistory = (history: BalancePoint[], balance: number): BalancePoint[] =>
  [...history, { at: Date.now(), balance }].slice(-MAX_HISTORY)

function snapshotOf(s: CasinoData): AchievementSnapshot {
  return {
    balance: s.balance,
    peakBalance: s.lifetime.peakBalance,
    rounds: s.lifetime.rounds,
    currentStreak: s.lifetime.currentStreak,
    bestStreak: s.lifetime.bestStreak,
    refills: s.lifetime.refills,
    dailyStreak: s.daily.streak,
    level: levelFromXp(s.xp).level,
    gamesPlayed: GAME_IDS.filter((g) => (s.games[g]?.rounds ?? 0) > 0),
  }
}

/** Win-rate over decided rounds (pushes excluded). */
export function winRate(stats: Pick<GameStats, 'wins' | 'losses'>): number {
  const decided = stats.wins + stats.losses
  return decided === 0 ? 0 : stats.wins / decided
}

/** True once at least one round was won or lost (so a win-rate is meaningful). */
export const hasDecided = (stats?: Pick<GameStats, 'wins' | 'losses'>) => !!stats && stats.wins + stats.losses > 0

export interface DailyStatus {
  available: boolean
  /** Epoch ms when the next bonus unlocks (== now when available). */
  nextAt: number
  /** Streak day the next claim will count as (1..7). */
  nextStreakDay: number
  amount: number
}

export function getDailyStatus(daily: DailyState, now = Date.now()): DailyStatus {
  const last = daily.lastClaimAt
  const available = last === null || now - last >= DAILY_COOLDOWN_MS
  const streakAlive = last !== null && now - last < DAILY_STREAK_WINDOW_MS
  const nextStreakDay = streakAlive ? Math.min(daily.streak + 1, DAILY_MAX_STREAK) : 1
  return {
    available,
    nextAt: last === null ? now : Math.max(now, last + DAILY_COOLDOWN_MS),
    nextStreakDay,
    amount: dailyBonusAmount(nextStreakDay),
  }
}

export const canRefill = (s: Pick<CasinoData, 'balance'>) => s.balance < REFILL_THRESHOLD

export interface FaucetStatus {
  available: boolean
  nextAt: number
  amount: number
}

export function getFaucetStatus(lastClaimAt: number | null, xp: number, now = Date.now()): FaucetStatus {
  const available = lastClaimAt === null || now - lastClaimAt >= FAUCET_COOLDOWN_MS
  return {
    available,
    nextAt: lastClaimAt === null ? now : Math.max(now, lastClaimAt + FAUCET_COOLDOWN_MS),
    amount: faucetAmount(levelFromXp(xp).level),
  }
}

/** Credits free chips outside of a round (bonuses, rewards). */
function creditFree(s: CasinoData, amount: number): Pick<CasinoData, 'balance' | 'balanceHistory'> & {
  peakBalance: number
} {
  const balance = s.balance + amount
  return {
    balance,
    balanceHistory: pushHistory(s.balanceHistory, balance),
    peakBalance: Math.max(s.lifetime.peakBalance, balance),
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */
export const useCasino = create<CasinoState>()(
  persist(
    (set, get) => {
      /** Evaluates achievements, credits their rewards and fires toasts. */
      const unlockAchievements = (round?: RoundRecord & { tags: readonly RoundTag[] }) => {
        const state = get()
        const fresh: AchievementDef[] = findNewAchievements(
          state.achievements,
          snapshotOf(state),
          round && { wager: round.wager, net: round.net, multiplier: round.multiplier, tags: round.tags },
        )
        if (fresh.length === 0) return
        const now = Date.now()
        const reward = fresh.reduce((sum, a) => sum + a.reward, 0)
        set((s) => {
          const { peakBalance, ...credit } = creditFree(s, reward)
          return {
            ...credit,
            achievements: { ...s.achievements, ...Object.fromEntries(fresh.map((a) => [a.id, now])) },
            lifetime: { ...s.lifetime, rewardChips: s.lifetime.rewardChips + reward, peakBalance },
          }
        })
        for (const a of fresh) {
          toast({ kind: 'achievement', title: a.title, message: a.description, amount: a.reward, icon: a.icon })
        }
      }

      /** Adds XP and pays level-up rewards. */
      const grantXp = (amount: number) => {
        const before = levelFromXp(get().xp).level
        const xp = get().xp + amount
        const after = levelFromXp(xp).level
        let reward = 0
        for (let l = before + 1; l <= after; l++) reward += levelUpReward(l)
        set((s) => {
          if (reward === 0) return { xp }
          const { peakBalance, ...credit } = creditFree(s, reward)
          return { xp, ...credit, lifetime: { ...s.lifetime, rewardChips: s.lifetime.rewardChips + reward, peakBalance } }
        })
        if (after > before) {
          toast({
            kind: 'level',
            title: `Уровень ${after}!`,
            message: `Новое звание: ${levelFromXp(xp).title}.`,
            amount: reward,
            icon: 'glowing-star',
          })
        }
      }

      return {
        ...initialData(),

        startRound: (game, wager, fallback) => {
          const amount = Math.floor(wager)
          if (!(amount > 0) || amount > get().balance) return null
          const round: OpenRound = { id: randomId(), game, wager: amount, startedAt: Date.now(), fallback }
          set((s) => ({ balance: s.balance - amount, openRounds: [...s.openRounds, round] }))
          return round.id
        },

        raiseRound: (id, extra) => {
          const amount = Math.floor(extra)
          const s = get()
          if (!(amount > 0) || amount > s.balance || !s.openRounds.some((r) => r.id === id)) return false
          set({
            balance: s.balance - amount,
            openRounds: s.openRounds.map((r) => (r.id === id ? { ...r, wager: r.wager + amount } : r)),
          })
          return true
        },

        setRoundFallback: (id, fallback) =>
          set((s) => ({ openRounds: s.openRounds.map((r) => (r.id === id ? { ...r, fallback } : r)) })),

        finishRound: (id, settlement) => {
          const round = get().openRounds.find((r) => r.id === id)
          if (!round) return null
          const result = settlement ?? round.fallback ?? { payout: 0 }
          const payout = Math.max(0, Math.floor(result.payout))
          const record: RoundRecord = {
            id: round.id,
            game: round.game,
            wager: round.wager,
            payout,
            net: payout - round.wager,
            multiplier: round.wager > 0 ? payout / round.wager : 0,
            detail: result.detail,
            at: Date.now(),
          }
          set((s) => {
            const balance = s.balance + payout
            const lifetimeBase = applyRound(s.lifetime, record)
            const currentStreak = record.net > 0 ? s.lifetime.currentStreak + 1 : record.net < 0 ? 0 : s.lifetime.currentStreak
            return {
              balance,
              openRounds: s.openRounds.filter((r) => r.id !== id),
              games: { ...s.games, [round.game]: applyRound(s.games[round.game] ?? emptyGameStats(), record) },
              lifetime: {
                ...s.lifetime,
                ...lifetimeBase,
                currentStreak,
                bestStreak: Math.max(s.lifetime.bestStreak, currentStreak),
                peakBalance: Math.max(s.lifetime.peakBalance, balance),
              },
              recent: [record, ...s.recent].slice(0, MAX_RECENT),
              balanceHistory: pushHistory(s.balanceHistory, balance),
            }
          })
          grantXp(xpForRound(record.wager, record.net > 0))
          unlockAchievements({ ...record, tags: result.tags ?? [] })
          return record
        },

        cancelRound: (id) =>
          set((s) => {
            const round = s.openRounds.find((r) => r.id === id)
            if (!round) return s
            return { balance: s.balance + round.wager, openRounds: s.openRounds.filter((r) => r.id !== id) }
          }),

        recoverRounds: () => {
          for (const round of get().openRounds) {
            if (round.fallback) get().finishRound(round.id)
          }
        },

        claimDailyBonus: (now = Date.now()) => {
          const status = getDailyStatus(get().daily, now)
          if (!status.available) return 0
          set((s) => {
            const { peakBalance, ...credit } = creditFree(s, status.amount)
            return {
              ...credit,
              daily: { lastClaimAt: now, streak: status.nextStreakDay },
              lifetime: { ...s.lifetime, dailyClaims: s.lifetime.dailyClaims + 1, peakBalance },
            }
          })
          unlockAchievements()
          return status.amount
        },

        claimFaucet: (now = Date.now()) => {
          const status = getFaucetStatus(get().faucetLastClaimAt, get().xp, now)
          if (!status.available) return 0
          set((s) => {
            const { peakBalance, ...credit } = creditFree(s, status.amount)
            return {
              ...credit,
              faucetLastClaimAt: now,
              lifetime: { ...s.lifetime, faucetClaims: s.lifetime.faucetClaims + 1, peakBalance },
            }
          })
          return status.amount
        },

        claimRefill: () => {
          const s = get()
          if (!canRefill(s)) return 0
          const amount = REFILL_TARGET - s.balance
          set({
            balance: REFILL_TARGET,
            lifetime: { ...s.lifetime, refills: s.lifetime.refills + 1 },
            balanceHistory: pushHistory(s.balanceHistory, REFILL_TARGET),
          })
          unlockAchievements()
          return amount
        },

        toggleFavorite: (game) =>
          set((s) => ({
            favorites: s.favorites.includes(game) ? s.favorites.filter((g) => g !== game) : [...s.favorites, game],
          })),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        resetProgress: () => set({ ...initialData(), settings: get().settings }),
      }
    },
    {
      name: `${STORAGE_PREFIX}:casino`,
      version: 1,
      storage: persistStorage,
      partialize: (s): CasinoData => ({
        balance: s.balance,
        xp: s.xp,
        faucetLastClaimAt: s.faucetLastClaimAt,
        favorites: s.favorites,
        openRounds: s.openRounds,
        lifetime: s.lifetime,
        games: s.games,
        recent: s.recent,
        balanceHistory: s.balanceHistory,
        daily: s.daily,
        achievements: s.achievements,
        settings: s.settings,
      }),
      merge: (persisted, current) => {
        // Merge nested objects so newly added fields keep their defaults.
        const p = (persisted ?? {}) as Partial<CasinoData>
        return {
          ...current,
          ...p,
          lifetime: { ...current.lifetime, ...p.lifetime },
          daily: { ...current.daily, ...p.daily },
          settings: { ...current.settings, ...p.settings },
        }
      },
      onRehydrateStorage: () => (state) => {
        state?.recoverRounds()
      },
    },
  ),
)

/* ------------------------------------------------------------------ */
/* Selectors                                                            */
/* ------------------------------------------------------------------ */
export const selectBalance = (s: CasinoState) => s.balance
export const selectXp = (s: CasinoState) => s.xp
export const selectSettings = (s: CasinoState) => s.settings
