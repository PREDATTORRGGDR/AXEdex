import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sfx } from '../../audio/sfx'
import type { Card } from '../../lib/cards'
import { wait } from '../../lib/async'
import { useCasino } from '../../store/casino'
import { persistStorage, STORAGE_PREFIX } from '../../store/storage'
import {
  canDouble,
  canSplit,
  cardValue,
  createShoe,
  dealerShouldHit,
  handTotal,
  isBlackjack,
  needsShuffle,
  newHand,
  OUTCOME_LABEL,
  settleHand,
  type HandResult,
  type PlayerHand,
} from './logic'

export type Phase = 'betting' | 'dealing' | 'insurance' | 'player' | 'dealer' | 'settled'

interface BlackjackState {
  shoe: Card[]
  phase: Phase
  dealer: Card[]
  holeRevealed: boolean
  hands: PlayerHand[]
  active: number
  bet: number
  insurance: number
  roundId: string | null
  results: HandResult[] | null
  insuranceWon: boolean
  totalPayout: number
  totalWager: number
  busy: boolean
  shuffling: boolean

  setBet: (bet: number) => void
  deal: () => Promise<void>
  resolveInsurance: (take: boolean) => Promise<void>
  hit: () => Promise<void>
  stand: () => Promise<void>
  double: () => Promise<void>
  split: () => Promise<void>
  newRound: () => void
  /** Resumes interrupted flows and drops rounds the wallet no longer knows. */
  reconcile: () => void
}

const DEAL_MS = 360
const DEALER_MS = 620

type Set = (partial: Partial<BlackjackState> | ((s: BlackjackState) => Partial<BlackjackState>)) => void
type Get = () => BlackjackState

/** Draws the top card, reshuffling a fresh shoe if it ever ran dry. */
function draw(get: Get, set: Set): Card {
  let shoe = get().shoe
  if (shoe.length === 0) shoe = createShoe()
  const [card, ...rest] = shoe
  set({ shoe: rest })
  sfx.play('deal')
  return card
}

export const useBlackjack = create<BlackjackState>()(
  persist(
    (set, get) => {
      const settle = () => {
        const s = get()
        const results = s.hands.map((h) => settleHand(h, s.dealer))
        const dealerNatural = isBlackjack(s.dealer)
        const insuranceWon = s.insurance > 0 && dealerNatural
        const payout = results.reduce((sum, r) => sum + r.payout, 0) + (insuranceWon ? s.insurance * 3 : 0)
        const wager = s.hands.reduce((sum, h) => sum + h.bet, 0) + s.insurance
        const natural = results.some((r) => r.outcome === 'blackjack')
        const detail =
          results.length === 1
            ? `${OUTCOME_LABEL[results[0].outcome]} · ${handTotal(s.hands[0].cards).total} против ${handTotal(s.dealer).total}`
            : `${results.length} руки · дилер ${handTotal(s.dealer).total}`
        if (s.roundId) {
          useCasino.getState().finishRound(s.roundId, { payout, tags: natural ? ['bj-natural'] : undefined, detail })
        }
        set({ phase: 'settled', results, insuranceWon, totalPayout: payout, totalWager: wager, roundId: null, busy: false })
      }

      const dealerTurn = async (fast = false) => {
        set({ phase: 'dealer', busy: true })
        if (!get().holeRevealed) {
          if (!fast) await wait(350)
          set({ holeRevealed: true })
          sfx.play('flip')
        }
        const allBust = get().hands.every((h) => handTotal(h.cards).total > 21)
        const allNaturals = get().hands.every((h) => !h.fromSplit && isBlackjack(h.cards))
        if (!allBust && !allNaturals) {
          while (dealerShouldHit(get().dealer)) {
            if (!fast) await wait(DEALER_MS)
            set((s) => ({ dealer: [...s.dealer, draw(get, set)] }))
          }
        }
        if (!fast) await wait(450)
        settle()
      }

      /** Moves to the next unfinished hand, or hands over to the dealer. */
      const advance = async () => {
        const s = get()
        const hands = s.hands.map((h) =>
          !h.done && (handTotal(h.cards).total >= 21 || h.splitAces) ? { ...h, done: true } : h,
        )
        set({ hands })
        const next = hands.findIndex((h) => !h.done)
        if (next === -1) {
          await dealerTurn()
        } else {
          set({ active: next, phase: 'player', busy: false })
        }
      }

      /** Dealer peek for blackjack when showing an ace or a ten. */
      const peek = async (fast = false) => {
        const s = get()
        const up = s.dealer[0]
        if (cardValue(up.rank) >= 10 && isBlackjack(s.dealer)) {
          if (!fast) await wait(400)
          set({ holeRevealed: true })
          sfx.play('flip')
          if (!fast) await wait(600)
          settle()
          return
        }
        if (isBlackjack(s.hands[0].cards)) {
          await dealerTurn(fast)
          return
        }
        set({ phase: 'player', active: 0, busy: false })
      }

      const finishDeal = async (fast = false) => {
        // Deal alternately until both player and dealer hold two cards.
        while (get().hands[0].cards.length < 2 || get().dealer.length < 2) {
          const s = get()
          const playerTurn = s.hands[0].cards.length <= s.dealer.length
          if (!fast) await wait(DEAL_MS)
          if (playerTurn) {
            const card = draw(get, set)
            set((st) => ({ hands: [{ ...st.hands[0], cards: [...st.hands[0].cards, card] }] }))
          } else {
            const card = draw(get, set)
            set((st) => ({ dealer: [...st.dealer, card] }))
          }
        }
        if (get().dealer[0].rank === 14 && !fast) {
          set({ phase: 'insurance', busy: false })
          return
        }
        await peek(fast)
      }

      return {
        shoe: [],
        phase: 'betting',
        dealer: [],
        holeRevealed: false,
        hands: [],
        active: 0,
        bet: 10,
        insurance: 0,
        roundId: null,
        results: null,
        insuranceWon: false,
        totalPayout: 0,
        totalWager: 0,
        busy: false,
        shuffling: false,

        setBet: (bet) => set({ bet: Math.max(0, Math.floor(bet)) }),

        deal: async () => {
          const s = get()
          if (s.busy || (s.phase !== 'betting' && s.phase !== 'settled') || s.bet <= 0) return
          if (s.shoe.length === 0 || needsShuffle(s.shoe)) {
            set({ busy: true, shuffling: true, phase: 'betting', dealer: [], hands: [], results: null })
            sfx.play('whoosh')
            await wait(1400)
            set({ shoe: createShoe(), shuffling: false })
          }
          const roundId = useCasino.getState().startRound('blackjack', s.bet)
          if (!roundId) {
            set({ busy: false })
            sfx.play('error')
            return
          }
          set({
            roundId,
            phase: 'dealing',
            busy: true,
            dealer: [],
            holeRevealed: false,
            hands: [newHand([], s.bet)],
            active: 0,
            insurance: 0,
            results: null,
            insuranceWon: false,
            totalPayout: 0,
            totalWager: s.bet,
          })
          await finishDeal()
        },

        resolveInsurance: async (take) => {
          const s = get()
          if (s.phase !== 'insurance' || !s.roundId) return
          const cost = Math.floor(s.hands[0].bet / 2)
          if (take && cost > 0 && useCasino.getState().raiseRound(s.roundId, cost)) {
            set({ insurance: cost })
            sfx.play('chip')
          }
          set({ busy: true })
          await peek()
        },

        hit: async () => {
          const s = get()
          if (s.busy || s.phase !== 'player') return
          set({ busy: true })
          const card = draw(get, set)
          set((st) => ({
            hands: st.hands.map((h, i) => (i === st.active ? { ...h, cards: [...h.cards, card] } : h)),
          }))
          const total = handTotal(get().hands[get().active].cards).total
          if (total > 21) sfx.play('lose')
          await wait(total >= 21 ? 450 : 150)
          if (total >= 21) await advance()
          else set({ busy: false })
        },

        stand: async () => {
          const s = get()
          if (s.busy || s.phase !== 'player') return
          set({ busy: true, hands: s.hands.map((h, i) => (i === s.active ? { ...h, done: true } : h)) })
          await advance()
        },

        double: async () => {
          const s = get()
          const hand = s.hands[s.active]
          if (s.busy || s.phase !== 'player' || !s.roundId || !canDouble(hand)) return
          if (!useCasino.getState().raiseRound(s.roundId, hand.bet)) {
            sfx.play('error')
            return
          }
          sfx.play('chip')
          set({ busy: true })
          await wait(200)
          const card = draw(get, set)
          set((st) => ({
            hands: st.hands.map((h, i) =>
              i === st.active ? { ...h, bet: h.bet * 2, doubled: true, done: true, cards: [...h.cards, card] } : h,
            ),
          }))
          await wait(500)
          await advance()
        },

        split: async () => {
          const s = get()
          const hand = s.hands[s.active]
          if (s.busy || s.phase !== 'player' || !s.roundId || !canSplit(hand, s.hands.length)) return
          if (!useCasino.getState().raiseRound(s.roundId, hand.bet)) {
            sfx.play('error')
            return
          }
          sfx.play('chip')
          set({ busy: true })
          const aces = hand.cards[0].rank === 14
          const first = newHand([hand.cards[0]], hand.bet, true, false)
          const second = newHand([hand.cards[1]], hand.bet, true, false)
          set((st) => ({
            hands: [...st.hands.slice(0, st.active), first, second, ...st.hands.slice(st.active + 1)],
          }))
          await wait(DEAL_MS)
          const c1 = draw(get, set)
          set((st) => ({
            hands: st.hands.map((h, i) => (i === st.active ? { ...h, cards: [...h.cards, c1], splitAces: aces, done: aces } : h)),
          }))
          await wait(DEAL_MS)
          const c2 = draw(get, set)
          set((st) => ({
            hands: st.hands.map((h, i) =>
              i === st.active + 1 ? { ...h, cards: [...h.cards, c2], splitAces: aces, done: aces } : h,
            ),
          }))
          await wait(200)
          await advance()
        },

        newRound: () => {
          if (get().busy) return
          set({ phase: 'betting', dealer: [], hands: [], results: null, holeRevealed: false, insurance: 0, active: 0 })
        },

        reconcile: () => {
          const s = get()
          const casino = useCasino.getState()
          // Refund wallet rounds this table has lost track of.
          for (const r of casino.openRounds) {
            if (r.game === 'blackjack' && r.id !== s.roundId && !r.fallback) casino.cancelRound(r.id)
          }
          if (s.roundId && !casino.openRounds.some((r) => r.id === s.roundId)) {
            // The wallet was reset under us: start clean.
            set({ phase: 'betting', dealer: [], hands: [], roundId: null, busy: false, results: null, shuffling: false })
            return
          }
          set({ busy: false, shuffling: false })
          if (s.phase === 'dealing') void finishDeal(true)
          else if (s.phase === 'dealer') void dealerTurn(true)
        },
      }
    },
    {
      name: `${STORAGE_PREFIX}:blackjack`,
      storage: persistStorage,
      partialize: (s) => ({
        shoe: s.shoe,
        phase: s.phase,
        dealer: s.dealer,
        holeRevealed: s.holeRevealed,
        hands: s.hands,
        active: s.active,
        bet: s.bet,
        insurance: s.insurance,
        roundId: s.roundId,
        results: s.results,
        insuranceWon: s.insuranceWon,
        totalPayout: s.totalPayout,
        totalWager: s.totalWager,
      }),
    },
  ),
)

export function selectActions(s: BlackjackState) {
  const hand = s.hands[s.active]
  const ready = s.phase === 'player' && !s.busy && !!hand
  return {
    canHit: ready && !hand.done,
    canStand: ready && !hand.done,
    canDouble: ready && canDouble(hand),
    canSplit: ready && canSplit(hand, s.hands.length),
  }
}
