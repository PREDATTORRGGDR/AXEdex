import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { formatMultiplier, plural } from '../../lib/format'
import { randomInt } from '../../lib/rng'
import { useCasino } from '../../store/casino'
import { persistStorage, STORAGE_PREFIX } from '../../store/storage'
import { multiplierFor, placeMines, TILES } from './logic'

export type MinesPhase = 'idle' | 'playing' | 'busted' | 'cashed'

interface MinesState {
  phase: MinesPhase
  bet: number
  mines: number
  minePositions: number[]
  revealed: number[]
  roundId: string | null
  activeBet: number
  hitIndex: number | null
  payout: number
  setBet: (bet: number) => void
  setMines: (mines: number) => void
  start: () => boolean
  /** Returns 'safe' | 'mine' | null (ignored). */
  reveal: (index: number) => 'safe' | 'mine' | null
  randomPick: () => 'safe' | 'mine' | null
  cashOut: () => number
  reconcile: () => void
}

export const useMines = create<MinesState>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      bet: 100,
      mines: 3,
      minePositions: [],
      revealed: [],
      roundId: null,
      activeBet: 0,
      hitIndex: null,
      payout: 0,

      setBet: (bet) => set({ bet }),
      setMines: (mines) => get().phase !== 'playing' && set({ mines: Math.max(1, Math.min(24, mines)) }),

      start: () => {
        const s = get()
        if (s.phase === 'playing') return false
        const roundId = useCasino.getState().startRound('mines', s.bet)
        if (!roundId) return false
        set({
          phase: 'playing',
          roundId,
          activeBet: s.bet,
          minePositions: placeMines(s.mines),
          revealed: [],
          hitIndex: null,
          payout: 0,
        })
        return true
      },

      reveal: (index) => {
        const s = get()
        if (s.phase !== 'playing' || s.revealed.includes(index) || !s.roundId) return null
        if (s.minePositions.includes(index)) {
          useCasino.getState().finishRound(s.roundId, {
            payout: 0,
            detail: `Мина после ${s.revealed.length} ${s.revealed.length === 1 ? 'кристалла' : 'кристаллов'}`,
          })
          set({ phase: 'busted', hitIndex: index, roundId: null, payout: 0 })
          return 'mine'
        }
        const revealed = [...s.revealed, index]
        set({ revealed })
        // Everything safe uncovered: cash out automatically.
        if (revealed.length === TILES - s.mines) get().cashOut()
        return 'safe'
      },

      randomPick: () => {
        const s = get()
        const hidden = Array.from({ length: TILES }, (_, i) => i).filter((i) => !s.revealed.includes(i))
        if (!hidden.length) return null
        return get().reveal(hidden[randomInt(hidden.length)])
      },

      cashOut: () => {
        const s = get()
        if (s.phase !== 'playing' || !s.roundId || s.revealed.length === 0) return 0
        const mult = multiplierFor(s.mines, s.revealed.length)
        const payout = Math.floor(s.activeBet * mult)
        useCasino.getState().finishRound(s.roundId, {
          payout,
          tags: s.revealed.length >= 15 ? ['mines-15'] : undefined,
          detail: `${s.revealed.length} ${plural(s.revealed.length, ['кристалл', 'кристалла', 'кристаллов'])} · ${formatMultiplier(mult)}`,
        })
        set({ phase: 'cashed', roundId: null, payout })
        return payout
      },

      reconcile: () => {
        const s = get()
        const casino = useCasino.getState()
        for (const r of casino.openRounds) {
          if (r.game === 'mines' && r.id !== s.roundId && !r.fallback) casino.cancelRound(r.id)
        }
        if (s.roundId && !casino.openRounds.some((r) => r.id === s.roundId)) {
          set({ phase: 'idle', roundId: null, revealed: [], minePositions: [], hitIndex: null })
        }
      },
    }),
    {
      name: `${STORAGE_PREFIX}:mines`,
      storage: persistStorage,
      partialize: (s) => ({
        phase: s.phase,
        bet: s.bet,
        mines: s.mines,
        minePositions: s.minePositions,
        revealed: s.revealed,
        roundId: s.roundId,
        activeBet: s.activeBet,
        hitIndex: s.hitIndex,
        payout: s.payout,
      }),
    },
  ),
)
