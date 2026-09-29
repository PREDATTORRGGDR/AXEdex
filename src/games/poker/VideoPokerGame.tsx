import { Lightbulb, Minus, Plus, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { PlayingCard } from '../../components/game/PlayingCard'
import { ResultBanner } from '../../components/game/ResultBanner'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { useMountedRef } from '../../hooks/useMounted'
import { useResultBanner } from '../../hooks/useResultBanner'
import { wait } from '../../lib/async'
import type { Card } from '../../lib/cards'
import { cn } from '../../lib/cn'
import { formatChips } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { toast } from '../../store/toasts'
import { deal, draw, evaluateHand, HAND_NAMES, HAND_ORDER, MAX_COINS, payPerCoin, suggestHolds, type HandRank } from './logic'

type Phase = 'idle' | 'dealing' | 'hold' | 'drawing' | 'result'

const COIN_VALUES = [1, 2, 5, 10, 25, 50]

function settlement(hand: Card[], coins: number, coinValue: number) {
  const rank = evaluateHand(hand)
  const payout = rank ? payPerCoin(rank, coins) * coins * coinValue : 0
  return {
    rank,
    payout,
    tags: rank === 'royal' ? (['royal-flush'] as const) : undefined,
    detail: rank ? HAND_NAMES[rank] : 'Без комбінації',
  }
}

export default function VideoPokerGame() {
  const balance = useCasino((s) => s.balance)
  const mounted = useMountedRef()
  const [banner, showBanner] = useResultBanner(2600)

  const [coins, setCoins] = useState(5)
  const [coinValue, setCoinValue] = useState(1)
  const [phase, setPhase] = useState<Phase>('idle')
  const [hand, setHand] = useState<Card[]>([])
  const [deck, setDeck] = useState<Card[]>([])
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false])
  const [faceUp, setFaceUp] = useState<boolean[]>([false, false, false, false, false])
  const [result, setResult] = useState<HandRank | null>(null)
  const [dealId, setDealId] = useState(0)
  const roundRef = useRef<{ id: string; bet: number } | null>(null)

  const bet = coins * coinValue
  const current = phase === 'hold' ? evaluateHand(hand) : null

  // Leaving between deal and draw stands pat: the stored fallback pays the dealt hand.
  useEffect(
    () => () => {
      const r = roundRef.current
      if (r) useCasino.getState().finishRound(r.id)
    },
    [],
  )

  const onDeal = async () => {
    if (phase === 'dealing' || phase === 'drawing') return
    if (bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостатньо фішок', message: 'Зменште ставку або заберіть бонус.' })
      return
    }
    const d = deal()
    const s = settlement(d.hand, coins, coinValue)
    const id = useCasino.getState().startRound('poker', bet, { payout: s.payout, tags: s.tags ? [...s.tags] : undefined, detail: s.detail })
    if (!id) return
    roundRef.current = { id, bet }
    setResult(null)
    setHeld([false, false, false, false, false])
    setFaceUp([false, false, false, false, false])
    setHand(d.hand)
    setDeck(d.deck)
    setDealId((n) => n + 1)
    setPhase('dealing')
    for (let i = 0; i < 5; i++) {
      await wait(110)
      if (!mounted.current) return
      sfx.play('deal')
      setFaceUp((f) => f.map((v, j) => (j === i ? true : v)))
    }
    await wait(250)
    setPhase('hold')
    const r = evaluateHand(d.hand)
    if (r) sfx.play('ping')
  }

  const onDraw = async () => {
    if (phase !== 'hold' || !roundRef.current) return
    setPhase('drawing')
    const replaced = held.map((h) => !h)
    if (replaced.some(Boolean)) {
      setFaceUp((f) => f.map((v, i) => (replaced[i] ? false : v)))
      sfx.play('flip')
      await wait(380)
    }
    const next = draw(hand, held, deck)
    setHand(next)
    for (let i = 0; i < 5; i++) {
      if (!replaced[i]) continue
      await wait(120)
      if (!mounted.current) return
      sfx.play('deal')
      setFaceUp((f) => f.map((v, j) => (j === i ? true : v)))
    }
    await wait(350)
    const round = roundRef.current
    roundRef.current = null
    const s = settlement(next, coins, coinValue)
    useCasino.getState().finishRound(round.id, { payout: s.payout, tags: s.tags ? [...s.tags] : undefined, detail: s.detail })
    setResult(s.rank)
    setPhase('result')
    showBanner({
      kind: s.rank === 'royal' || s.payout >= round.bet * 20 ? 'bigwin' : s.payout > round.bet ? 'win' : s.payout === round.bet ? 'push' : 'lose',
      title: s.rank ? HAND_NAMES[s.rank] : 'Без комбінації',
      amount: s.payout - round.bet,
    })
  }

  const toggleHold = (i: number) => {
    if (phase !== 'hold') return
    sfx.play('click', { pitch: held[i] ? 0.8 : 1.3 })
    setHeld((h) => h.map((v, j) => (j === i ? !v : v)))
  }

  // Keyboard: 1–5 hold, Enter deals / draws.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (/^[1-5]$/.test(e.key)) toggleHold(Number(e.key) - 1)
      if (e.key === 'Enter') {
        e.preventDefault()
        if (phase === 'hold') void onDraw()
        else if (phase === 'idle' || phase === 'result') void onDeal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const busy = phase === 'dealing' || phase === 'drawing'
  const canChangeBet = phase === 'idle' || phase === 'result'
  const highlight = result ?? current

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Paytable */}
      <Panel strong className="overflow-x-auto p-2 sm:p-3">
        <table className="w-full border-separate border-spacing-0 text-xs sm:min-w-[520px] sm:text-sm">
          <tbody>
            {HAND_ORDER.map((rank) => {
              const active = highlight === rank
              return (
                <tr key={rank} className={cn('transition-colors', active && 'bg-gold-400/15')}>
                  <td className={cn('rounded-l-lg px-3 py-1 font-display font-bold tracking-wide whitespace-nowrap uppercase', active ? 'text-gold-100' : 'text-slate-300')}>{HAND_NAMES[rank]}</td>
                  {Array.from({ length: MAX_COINS }, (_, c) => {
                    const col = c + 1
                    const isCol = col === coins
                    return (
                      <td
                        key={c}
                        className={cn(
                          'num px-2 py-1 text-right font-bold last:rounded-r-lg max-sm:rounded-r-lg',
                          !isCol && 'max-sm:hidden',
                          isCol ? 'bg-neon-emerald/10 text-neon-emerald' : 'text-slate-500',
                          active && isCol && 'animate-pulse bg-gold-300 text-ink-950',
                        )}
                      >
                        {formatChips(payPerCoin(rank, col) * col)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>

      <Panel strong className="relative overflow-hidden border border-white/[0.07] bg-[radial-gradient(90%_80%_at_50%_0%,rgba(34,225,255,0.12),transparent),linear-gradient(180deg,#0d121b,#07090d)] p-3 sm:p-8">
        <div className="flex min-h-[200px] items-center justify-center gap-1.5 sm:min-h-[260px] sm:gap-4">
          {(hand.length ? hand : Array.from({ length: 5 }, () => null)).map((card, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <AnimatePresence>
                {held[i] && phase !== 'idle' && (
                  <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-md bg-neon-emerald px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-[#03140d] uppercase shadow-[0_0_14px_-2px_rgba(25,245,163,0.8)] sm:px-2 sm:text-[10px]">
                    Тримати
                  </motion.span>
                )}
              </AnimatePresence>
              {!(held[i] && phase !== 'idle') && <span className="h-[19px]" />}
              <button
                type="button"
                onClick={() => toggleHold(i)}
                disabled={phase !== 'hold'}
                className={cn('rounded-xl transition-transform', phase === 'hold' && 'hover:-translate-y-1', held[i] && phase !== 'idle' && '-translate-y-2')}
                aria-label={`Карта ${i + 1}${held[i] ? ', утримується' : ''}`}
                aria-pressed={held[i]}
              >
                <PlayingCard
                  key={`${dealId}-${i}`}
                  card={card}
                  faceDown={!faceUp[i]}
                  size="lg"
                  highlight={held[i] && phase !== 'idle' ? 'gold' : null}
                />
              </button>
              <span className="num text-[10px] font-semibold text-slate-600">{i + 1}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 min-h-5 text-center text-sm font-semibold text-gold-200">
          {phase === 'hold' && (current ? `На руках: ${HAND_NAMES[current]}` : 'Позначте карти, які залишите')}
          {phase === 'idle' && 'Натисніть «Роздати», щоб почати'}
        </p>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:p-4">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div>
            <p className="eyebrow mb-1">Кредити</p>
            <div className="flex items-center gap-1.5">
              <Button variant="glass" size="sm" icon={Minus} aria-label="Менше кредитів" disabled={!canChangeBet || coins <= 1} onClick={() => setCoins((c) => c - 1)} />
              <span className="num w-8 text-center text-lg font-bold text-white">{coins}</span>
              <Button variant="glass" size="sm" icon={Plus} aria-label="Більше кредитів" disabled={!canChangeBet || coins >= MAX_COINS} onClick={() => setCoins((c) => c + 1)} />
            </div>
          </div>
          <div>
            <p className="eyebrow mb-1">Ціна кредиту</p>
            <div className="flex flex-wrap gap-1">
              {COIN_VALUES.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!canChangeBet}
                  onClick={() => (sfx.play('chip'), setCoinValue(v))}
                  data-on={coinValue === v}
                  className="preset num h-8 min-w-9 rounded-lg px-2 text-xs"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-1">Ставка</p>
            <p className="num text-lg leading-8 font-bold text-white">{formatChips(bet)}</p>
          </div>
        </div>
        <div className="flex gap-2 md:ml-auto">
          <Button variant="glass" icon={Lightbulb} aria-label="Підказка" disabled={phase !== 'hold'} onClick={() => setHeld(suggestHolds(hand))}>
            <span className="hidden min-[400px]:inline">Підказка</span>
          </Button>
          {phase === 'hold' || phase === 'drawing' ? (
            <Button variant="cyan" size="lg" icon={RefreshCw} sound={false} disabled={busy} className="min-w-0 flex-1 md:min-w-40" onClick={() => void onDraw()}>
              Обмін
            </Button>
          ) : (
            <Button variant="emerald" size="lg" sound={false} disabled={busy || bet > balance} className="min-w-0 flex-1 md:min-w-40" onClick={() => void onDeal()}>
              Роздати
            </Button>
          )}
        </div>
      </Panel>
    </div>
  )
}
