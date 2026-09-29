import { ArrowDown, ArrowUp, Equal, HandCoins, Play, SkipForward } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { PlayingCard } from '../../components/game/PlayingCard'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { useResultBanner } from '../../hooks/useResultBanner'
import type { Card } from '../../lib/cards'
import { cn } from '../../lib/cn'
import { formatChips, formatMultiplier, formatPercent } from '../../lib/format'
import { useCasino, type Settlement } from '../../store/casino'
import { toast } from '../../store/toasts'
import { drawCard, isCorrect, optionsFor, type GuessId } from './logic'

type Phase = 'idle' | 'playing' | 'busted' | 'cashed'

interface Step {
  card: Card
  guess?: GuessId
  correct?: boolean
  skipped?: boolean
}

const ICONS: Record<GuessId, typeof ArrowUp> = { higherEq: ArrowUp, higher: ArrowUp, lowerEq: ArrowDown, lower: ArrowDown, same: Equal }

function cashSettlement(bet: number, multiplier: number, correct: number): Settlement {
  return {
    payout: Math.floor(bet * multiplier),
    tags: correct >= 10 ? ['hilo-10'] : undefined,
    detail: `${correct} вгаданих · ${formatMultiplier(multiplier)}`,
  }
}

export default function HiLoGame() {
  const balance = useCasino((s) => s.balance)
  const [banner, showBanner] = useResultBanner(2600)

  const [bet, setBet] = useState(10)
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState<Step[]>([])
  const [multiplier, setMultiplier] = useState(1)
  const [correct, setCorrect] = useState(0)
  const [busy, setBusy] = useState(false)
  const [activeBet, setActiveBet] = useState(0)
  const round = useRef<{ id: string; bet: number } | null>(null)
  const trailRef = useRef<HTMLDivElement>(null)

  const current = steps[steps.length - 1]?.card
  const options = current && phase === 'playing' ? optionsFor(current.rank) : []

  // Leaving mid-game cashes out at the current multiplier (fallback kept in sync).
  useEffect(
    () => () => {
      const r = round.current
      if (r) useCasino.getState().finishRound(r.id)
    },
    [],
  )

  useEffect(() => {
    trailRef.current?.scrollTo({ left: trailRef.current.scrollWidth, behavior: 'smooth' })
  }, [steps.length])

  const start = () => {
    if (bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостатньо фішок' })
      return
    }
    // Until the first correct call, leaving simply refunds the stake.
    const id = useCasino.getState().startRound('hilo', bet, { payout: bet, detail: 'Повернення ставки' })
    if (!id) return
    round.current = { id, bet }
    setActiveBet(bet)
    setSteps([{ card: drawCard() }])
    setMultiplier(1)
    setCorrect(0)
    setPhase('playing')
    sfx.play('deal')
  }

  const guess = async (id: GuessId) => {
    const r = round.current
    if (!r || !current || busy) return
    const option = options.find((o) => o.id === id)!
    const next = drawCard()
    const ok = isCorrect(id, current.rank, next.rank)
    setBusy(true)
    sfx.play('flip')
    setSteps((s) => [...s.slice(0, -1), { ...s[s.length - 1], guess: id, correct: ok }, { card: next }])
    await new Promise((res) => setTimeout(res, 420))
    setBusy(false)
    if (ok) {
      const m = Math.floor(multiplier * option.multiplier * 100) / 100
      const c = correct + 1
      setMultiplier(m)
      setCorrect(c)
      useCasino.getState().setRoundFallback(r.id, cashSettlement(r.bet, m, c))
      sfx.play('gem', { pitch: Math.min(2, 0.9 + c * 0.06) })
      haptic(10)
    } else {
      round.current = null
      useCasino.getState().finishRound(r.id, { payout: 0, tags: correct >= 10 ? ['hilo-10'] : undefined, detail: `Помилка після ${correct} вгаданих` })
      setPhase('busted')
      showBanner({ kind: 'lose', title: 'Не вгадали', amount: -r.bet })
    }
  }

  const skip = () => {
    if (!current || busy || phase !== 'playing') return
    sfx.play('deal')
    setSteps((s) => [...s.slice(0, -1), { ...s[s.length - 1], skipped: true }, { card: drawCard() }])
  }

  const cashOut = () => {
    const r = round.current
    if (!r || correct === 0 || busy) return
    round.current = null
    const s = cashSettlement(r.bet, multiplier, correct)
    useCasino.getState().finishRound(r.id, s)
    setPhase('cashed')
    sfx.play('cashout')
    showBanner({ kind: multiplier >= 10 ? 'bigwin' : 'win', title: 'Виграш забрано', amount: s.payout - r.bet, multiplier }, { silent: multiplier < 10 })
  }

  const playing = phase === 'playing'

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
      <Panel strong className="felt relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-8 lg:col-start-2 lg:row-start-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(255,145,71,0.1),transparent)]" />
        <div className="relative flex min-h-[340px] flex-col items-center justify-center gap-5">
          <div className="grid w-full max-w-md grid-cols-3 gap-2 text-center sm:gap-3">
            <div className="well min-w-0 rounded-xl px-2 py-2 sm:px-3">
              <p className="eyebrow truncate text-[10px]">Множник</p>
              <p className="num text-lg font-bold text-gold-200">{formatMultiplier(multiplier)}</p>
            </div>
            <div className="well min-w-0 rounded-xl px-2 py-2 sm:px-3">
              <p className="eyebrow truncate text-[10px]">Серія</p>
              <p className="num text-lg font-bold text-white">{correct}</p>
            </div>
            <div className="well min-w-0 rounded-xl px-2 py-2 sm:px-3">
              <p className="eyebrow truncate text-[10px]">Виграш</p>
              <p className="num text-lg font-bold text-neon-emerald">{formatChips(phase === 'playing' ? Math.floor(activeBet * multiplier) : 0)}</p>
            </div>
          </div>

          <div className="relative h-[140px] w-[100px] sm:h-[150px] sm:w-[104px]">
            <AnimatePresence mode="popLayout">
              {current ? (
                <motion.div key={current.id} className="absolute inset-0 grid place-items-center" initial={{ x: 60, opacity: 0, rotate: 8 }} animate={{ x: 0, opacity: 1, rotate: 0 }} exit={{ x: -80, opacity: 0, rotate: -10 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
                  <PlayingCard card={current} size="lg" highlight={phase === 'busted' ? 'red' : phase === 'cashed' ? 'green' : null} className="scale-110 sm:scale-[1.15]" />
                </motion.div>
              ) : (
                <div className="absolute inset-0 grid place-items-center rounded-xl border-2 border-dashed border-white/10 text-xs text-slate-500">Карта</div>
              )}
            </AnimatePresence>
          </div>

          <div ref={trailRef} className="no-scrollbar flex w-full max-w-xl gap-2 overflow-x-auto px-1 pt-2 pb-1">
            {steps.slice(0, -1).map((s) => (
              <div key={s.card.id} className="relative shrink-0">
                <PlayingCard card={s.card} size="sm" dimmed={s.skipped} />
                <span
                  className={cn(
                    'absolute -top-2 -right-2 grid size-5 place-items-center rounded-full text-[10px] font-black ring-2 ring-ink-950',
                    s.skipped ? 'bg-slate-500 text-white' : s.correct ? 'bg-neon-emerald text-[#03140d]' : 'bg-neon-red text-white',
                  )}
                >
                  {s.skipped ? '»' : s.correct ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="flex flex-col gap-3 p-4 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
        <BetInput value={bet} onChange={setBet} min={1} disabled={playing} />
        {playing ? (
          <>
            {options.map((o) => {
              const Icon = ICONS[o.id]
              return (
                <Button key={o.id} variant={o.id.startsWith('higher') ? 'cyan' : o.id === 'same' ? 'violet' : 'danger'} size="lg" disabled={busy} onClick={() => void guess(o.id)} sound={false} className="min-w-0 !justify-between">
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="size-5 shrink-0" />
                    <span className="truncate">{o.label}</span>
                  </span>
                  <span className="num shrink-0 text-xs font-semibold opacity-90">
                    {formatMultiplier(o.multiplier)} · {formatPercent(o.chance)}
                  </span>
                </Button>
              )
            })}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="glass" icon={SkipForward} disabled={busy} onClick={skip}>
                Пропустити
              </Button>
              <Button variant="emerald" icon={HandCoins} disabled={busy || correct === 0} onClick={cashOut} sound={false}>
                Забрати
              </Button>
            </div>
          </>
        ) : (
          <Button variant="emerald" size="xl" icon={Play} sound={false} disabled={bet > balance} onClick={start}>
            {phase === 'idle' ? 'Почати гру' : 'Грати знову'}
          </Button>
        )}
        <p className="text-center text-[11px] leading-relaxed text-slate-500">Туз — старша карта. Рівна карта зараховується на користь «або рівно».</p>
      </Panel>
    </div>
  )
}
