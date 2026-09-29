import { Info, Minus, Plus, Repeat, RotateCw, Sparkles, Zap } from 'lucide-react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { sfx, haptic } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { AnimatedNumber } from '../../components/ui/AnimatedNumber'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Panel } from '../../components/ui/Panel'
import { useElementSize } from '../../hooks/useElementSize'
import { useMountedRef } from '../../hooks/useMounted'
import { useResultBanner } from '../../hooks/useResultBanner'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { wait } from '../../lib/async'
import { cn } from '../../lib/cn'
import { formatChips, formatMultiplier } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { celebrate } from '../../store/fx'
import { toast } from '../../store/toasts'
import {
  FREE_SPINS_AWARD,
  FREE_SPINS_MULTIPLIER,
  LINES,
  PAYLINES,
  PAYTABLE,
  playSpin,
  randomGrid,
  randomSymbol,
  REELS,
  ROWS,
  SCATTER_PAYS,
  SYMBOL_NAMES,
  type Grid,
  type SpinOutcome,
  type SymbolId,
} from './logic'
import { SlotSymbol } from './SlotSymbol'

const LINE_BETS = [1, 2, 5, 10, 20, 50, 100, 250, 500]
const LINE_COLORS = ['#fcd96b', '#34f5a0', '#22d3ee', '#f472d0', '#a78bfa', '#fb923c', '#ff4d6d', '#fde047', '#60a5fa', '#4ade80']
const GAP = 8

interface ReelProps {
  index: number
  strip: SymbolId[]
  spinId: number
  cell: number
  turbo: boolean
  winning: Set<string>
  onStopped: (index: number) => void
}

/** One reel: a vertical strip that scrolls down and lands on its top three symbols. */
function Reel({ index, strip, spinId, cell, turbo, winning, onStopped }: ReelProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>()

  useLayoutEffect(() => {
    if (spinId === 0 || !scope.current) return
    const start = -(strip.length - ROWS) * cell
    const duration = turbo ? 0.35 + index * 0.1 : 0.85 + index * 0.28
    const move = animate(scope.current, { y: [start, 0] }, { duration, ease: [0.18, 0.72, 0.3, 1.06] })
    animate(scope.current, { filter: ['blur(0px)', 'blur(2.5px)', 'blur(2px)', 'blur(0px)'] }, { duration, times: [0, 0.15, 0.75, 1] })
    let cancelled = false
    move.then(() => {
      if (cancelled) return
      sfx.play('reelStop', { pitch: 1 + index * 0.06 })
      onStopped(index)
    })
    return () => {
      cancelled = true
    }
    // The strip changes together with spinId; animate only once per spin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId, cell])

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-[linear-gradient(180deg,#05070f,#0d1430_50%,#05070f)] shadow-[inset_0_10px_20px_rgba(0,0,0,0.8),inset_0_-10px_20px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
      style={{ width: cell, height: cell * ROWS }}
    >
      <div ref={scope} className="will-change-transform">
        {strip.map((id, i) => {
          const isWin = i < ROWS && winning.has(`${index}:${i}`)
          return (
            <div key={i} className="relative grid place-items-center" style={{ height: cell }}>
              {isWin && (
                <motion.div
                  className="absolute inset-1 rounded-lg bg-white/10 ring-2 ring-gold-300/80"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
              )}
              <motion.div animate={isWin ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={isWin ? { duration: 0.9, repeat: Infinity } : undefined}>
                <SlotSymbol id={id} size={cell * 0.9} />
              </motion.div>
            </div>
          )
        })}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55),transparent_22%,transparent_78%,rgba(0,0,0,0.55))]" />
    </div>
  )
}

function Bulbs({ active }: { active: boolean }) {
  return (
    <div className="flex justify-between px-2">
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className={cn('size-1.5 rounded-full sm:size-2', i % 2 ? 'bg-gold-300' : 'bg-fuchsia-400')}
          style={{
            animation: `pulse-glow ${active ? 0.35 : 1.6}s ease-in-out ${i * (active ? 0.03 : 0.09)}s infinite`,
            boxShadow: `0 0 8px ${i % 2 ? '#fcd96b' : '#e879f9'}`,
          }}
        />
      ))}
    </div>
  )
}

function Paytable({ open, onClose }: { open: boolean; onClose: () => void }) {
  const order: Exclude<SymbolId, 'scatter'>[] = ['wild', 'seven', 'crown', 'gem', 'bell', 'clover', 'grape', 'lemon', 'cherry']
  return (
    <Modal open={open} onClose={onClose} title="Таблица выплат">
      <p className="mb-3 text-xs text-slate-400">Выплаты указаны в ставках на линию за 3, 4 и 5 символов подряд слева направо.</p>
      <ul className="space-y-1.5">
        {order.map((id) => (
          <li key={id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-1.5">
            <SlotSymbol id={id} size={40} />
            <span className="flex-1 text-sm font-semibold text-white">{SYMBOL_NAMES[id]}</span>
            {PAYTABLE[id].map((v, i) => (
              <span key={i} className="w-14 text-right text-xs text-slate-300 tabular-nums">
                <span className="text-slate-500">{i + 3}× </span>
                {v}
              </span>
            ))}
          </li>
        ))}
        <li className="flex items-center gap-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2">
          <SlotSymbol id="scatter" size={40} />
          <span className="flex-1 text-xs leading-snug text-slate-200">
            {SYMBOL_NAMES.scatter}: 3 / 4 / 5 в любом месте — ×{SCATTER_PAYS[3]} / ×{SCATTER_PAYS[4]} / ×{SCATTER_PAYS[5]} от общей ставки и {FREE_SPINS_AWARD} фриспинов с множителем ×{FREE_SPINS_MULTIPLIER}.
          </span>
        </li>
      </ul>
      <p className="mt-4 mb-2 text-xs font-semibold text-slate-400">Линии выплат</p>
      <div className="grid grid-cols-5 gap-2">
        {PAYLINES.map((line, li) => (
          <svg key={li} viewBox="0 0 50 30" className="rounded-md bg-white/[0.03]">
            {line.map((row, reel) => (
              <rect key={reel} x={reel * 10 + 1} y={row * 10 + 1} width="8" height="8" rx="1.5" fill={LINE_COLORS[li]} opacity="0.9" />
            ))}
          </svg>
        ))}
      </div>
    </Modal>
  )
}

const initialGrid = (): Grid => randomGrid()

export default function SlotsGame() {
  const balance = useCasino((s) => s.balance)
  const [wrapRef, { width }] = useElementSize<HTMLDivElement>()
  const guard = useRoundGuard()
  const mounted = useMountedRef()
  const [banner, showBanner] = useResultBanner(3200)

  const [lineBet, setLineBet] = useState(10)
  const [strips, setStrips] = useState<SymbolId[][]>(() => initialGrid())
  const [spinId, setSpinId] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [turbo, setTurbo] = useState(false)
  const [autoLeft, setAutoLeft] = useState(0)
  const [paytableOpen, setPaytableOpen] = useState(false)
  const [lastWin, setLastWin] = useState(0)
  const [outcome, setOutcome] = useState<SpinOutcome | null>(null)
  const [freeSpins, setFreeSpins] = useState<{ current: number; total: number; won: number } | null>(null)

  const stopped = useRef(0)
  const resolveStop = useRef<(() => void) | null>(null)
  const turboRef = useRef(turbo)
  useEffect(() => {
    turboRef.current = turbo
  }, [turbo])

  const totalBet = lineBet * LINES
  const cell = Math.max(48, Math.min(112, Math.floor((Math.min(width, 640) - GAP * (REELS - 1)) / REELS)))

  const onStopped = useCallback(() => {
    stopped.current++
    if (stopped.current >= REELS) resolveStop.current?.()
  }, [])

  /** Builds new strips (result on top, filler, then the previous screen) and waits for all reels. */
  const animateTo = useCallback(
    (grid: Grid) =>
      new Promise<void>((resolve) => {
        stopped.current = 0
        resolveStop.current = resolve
        setStrips((prev) =>
          grid.map((result, reel) => {
            const fillerCount = (turboRef.current ? 6 : 12) + reel * (turboRef.current ? 2 : 4)
            const filler = Array.from({ length: fillerCount }, () => randomSymbol())
            return [...result, ...filler, ...prev[reel].slice(0, ROWS)]
          }),
        )
        setSpinId((n) => n + 1)
        sfx.play('whoosh')
      }),
    [],
  )

  const totalBetRef = useRef(totalBet)
  useEffect(() => {
    totalBetRef.current = totalBet
  }, [totalBet])

  const present = useCallback(async (o: SpinOutcome) => {
    setOutcome(o)
    if (o.win > 0) {
      sfx.play(o.win >= totalBetRef.current * 5 ? 'bigWin' : 'win')
      haptic(20)
      await wait(turboRef.current ? 700 : 1300)
    } else if (o.scatterCells.length >= 2) {
      await wait(400)
    }
  }, [])

  const spin = useCallback(async () => {
    if (spinning) return
    const bet = totalBetRef.current
    if (bet > useCasino.getState().balance) {
      sfx.play('error')
      setAutoLeft(0)
      toast({ kind: 'warning', title: 'Недостаточно фишек', message: 'Уменьшите ставку или заберите бесплатные фишки.' })
      return
    }
    const seq = playSpin(bet / LINES)
    const roundId = useCasino.getState().startRound('slots', bet, {
      payout: seq.totalWin,
      tags: seq.freeSpins.length ? ['slots-free-spins'] : undefined,
      detail: seq.freeSpins.length ? `Фриспины: ${seq.freeSpins.length}` : seq.totalWin > 0 ? `Выигрыш ×${Math.round((seq.totalWin / bet) * 10) / 10}` : 'Без выигрыша',
    })
    if (!roundId) return
    guard.track(roundId)
    setSpinning(true)
    setOutcome(null)

    await animateTo(seq.base.grid)
    if (!mounted.current) return
    await present(seq.base)

    if (seq.freeSpins.length) {
      sfx.play('bonus')
      celebrate('confetti', 1.5)
      setFreeSpins({ current: 0, total: seq.freeSpins.length, won: 0 })
      showBanner({ kind: 'info', title: `${seq.base.freeSpinsAwarded} фриспинов!`, subtitle: `Все выигрыши ×${FREE_SPINS_MULTIPLIER}` }, { silent: true, ms: 1800 })
      await wait(2000)
      let won = 0
      for (let i = 0; i < seq.freeSpins.length; i++) {
        if (!mounted.current) return
        const fs = seq.freeSpins[i]
        setOutcome(null)
        setFreeSpins({ current: i + 1, total: seq.freeSpins.length, won })
        await animateTo(fs.grid)
        if (!mounted.current) return
        won += fs.win
        setFreeSpins({ current: i + 1, total: seq.freeSpins.length, won })
        await present(fs)
        await wait(250)
      }
      setFreeSpins(null)
    }

    const record = guard.finish(roundId)
    setLastWin(seq.totalWin)
    setSpinning(false)
    if (record && seq.totalWin > 0) {
      const mult = seq.totalWin / bet
      if (mult >= 10) {
        showBanner({ kind: 'bigwin', title: mult >= 50 ? 'Мега-выигрыш!' : 'Крупный выигрыш!', amount: seq.totalWin, multiplier: mult })
      } else if (seq.freeSpins.length) {
        showBanner({ kind: 'win', title: 'Бонус завершён', amount: seq.totalWin, multiplier: mult })
      }
    }
  }, [spinning, animateTo, present, guard, mounted, showBanner])

  // Autoplay loop.
  useEffect(() => {
    if (spinning || autoLeft <= 0) return
    const t = window.setTimeout(() => {
      setAutoLeft((n) => n - 1)
      void spin()
    }, 500)
    return () => window.clearTimeout(t)
  }, [spinning, autoLeft, spin])

  const winning = new Set<string>()
  outcome?.lineWins.forEach((w) => w.cells.forEach(([r, row]) => winning.add(`${r}:${row}`)))
  outcome?.scatterCells.forEach(([r, row]) => outcome.scatterCells.length >= 3 && winning.add(`${r}:${row}`))

  const changeBet = (dir: 1 | -1) => {
    const i = LINE_BETS.indexOf(lineBet)
    const next = LINE_BETS[Math.max(0, Math.min(LINE_BETS.length - 1, i + dir))]
    if (next !== lineBet) {
      sfx.play('chip')
      setLineBet(next)
    }
  }

  const reelsWidth = cell * REELS + GAP * (REELS - 1)
  const inBonus = freeSpins !== null

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div ref={wrapRef} className="min-w-0">
        <div
          className={cn(
            'relative mx-auto rounded-[30px] p-[3px] transition-shadow duration-500',
            inBonus
              ? 'bg-[linear-gradient(135deg,#f0abfc,#7c3aed,#22d3ee,#f0abfc)] shadow-[0_0_60px_-10px_rgba(232,121,249,0.7)]'
              : 'bg-[linear-gradient(135deg,#fff4d1,#e2ab1c_35%,#6b4a0a_60%,#fcd96b)] shadow-[0_0_50px_-15px_rgba(245,197,66,0.6)]',
          )}
          style={{ maxWidth: reelsWidth + 48 }}
        >
          <div className={cn('relative overflow-hidden rounded-[27px] px-3 pt-3 pb-4 sm:px-5 sm:pt-4', inBonus ? 'bg-[radial-gradient(120%_80%_at_50%_0%,#3b0764,#070b18_70%)]' : 'bg-[radial-gradient(120%_80%_at_50%_0%,#1c1440,#070b18_70%)]')}>
            <Bulbs active={spinning} />
            <div className="my-2 text-center sm:my-3">
              <p className="font-display text-2xl font-black tracking-[0.2em] text-fuchsia-200 [text-shadow:0_0_10px_#e879f9,0_0_30px_#c026d3] sm:text-4xl">
                НЕОН <span className="text-gold-200 [text-shadow:0_0_10px_#fcd96b,0_0_30px_#e2ab1c]">777</span>
              </p>
              <AnimatePresence>
                {inBonus && (
                  <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-xs font-bold tracking-wider text-fuchsia-200 uppercase sm:text-sm">
                    <Sparkles className="mr-1 inline size-4" />
                    Фриспин {freeSpins.current} из {freeSpins.total} · ×{FREE_SPINS_MULTIPLIER} · бонус {formatChips(freeSpins.won)}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="relative mx-auto" style={{ width: reelsWidth }}>
              <div className="flex" style={{ gap: GAP }}>
                {strips.map((strip, i) => (
                  <Reel key={i} index={i} strip={strip} spinId={spinId} cell={cell} turbo={turbo} winning={winning} onStopped={onStopped} />
                ))}
              </div>
              {/* Winning paylines */}
              {outcome && outcome.lineWins.length > 0 && (
                <svg className="pointer-events-none absolute inset-0" width={reelsWidth} height={cell * ROWS}>
                  {outcome.lineWins.map((w) => {
                    const pts = PAYLINES[w.line].map((row, reel) => `${reel * (cell + GAP) + cell / 2},${row * cell + cell / 2}`).join(' ')
                    return (
                      <motion.polyline
                        key={w.line}
                        points={pts}
                        fill="none"
                        stroke={LINE_COLORS[w.line]}
                        strokeWidth={3}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.9 }}
                        transition={{ duration: 0.5 }}
                        style={{ filter: `drop-shadow(0 0 6px ${LINE_COLORS[w.line]})` }}
                      />
                    )
                  })}
                </svg>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-black/40 px-4 py-2 ring-1 ring-white/10">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Выигрыш</span>
              <AnimatedNumber
                value={outcome?.win ?? (inBonus ? 0 : lastWin)}
                className={cn('font-display text-xl font-black tabular-nums sm:text-2xl', (outcome?.win ?? 0) > 0 ? 'text-gold-gradient' : 'text-slate-300')}
              />
            </div>
            <ResultBanner result={banner} />
          </div>
        </div>
        {outcome && outcome.lineWins.length > 0 && (
          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-1.5">
            {outcome.lineWins.map((w) => (
              <span key={w.line} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-slate-300 ring-1" style={{ ['--tw-ring-color' as string]: `${LINE_COLORS[w.line]}80` }}>
                Линия {w.line + 1}: {SYMBOL_NAMES[w.symbol]} ×{w.count} — <b className="text-white">{formatChips(w.win)}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      <Panel strong className="flex flex-col gap-4 p-4 lg:self-start">
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-400">Ставка на линию</p>
          <div className="flex items-center gap-2">
            <Button variant="glass" size="md" icon={Minus} aria-label="Уменьшить ставку" sound={false} disabled={spinning || lineBet === LINE_BETS[0]} onClick={() => changeBet(-1)} />
            <div className="flex-1 rounded-xl bg-ink-950/60 py-2 text-center ring-1 ring-white/10">
              <p className="text-lg font-black text-white tabular-nums">{formatChips(lineBet)}</p>
              <p className="text-[10px] text-slate-400">
                {LINES} линий · всего {formatChips(totalBet)}
              </p>
            </div>
            <Button variant="glass" size="md" icon={Plus} aria-label="Увеличить ставку" sound={false} disabled={spinning || lineBet === LINE_BETS[LINE_BETS.length - 1]} onClick={() => changeBet(1)} />
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          disabled={spinning || totalBet > balance}
          onClick={() => void spin()}
          className="group relative mx-auto grid size-28 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff4d1,#fcd96b_35%,#e2ab1c_60%,#8a620d)] text-ink-950 shadow-[0_0_0_6px_rgba(7,11,24,0.9),0_0_0_8px_rgba(252,217,107,0.5),0_0_40px_rgba(245,197,66,0.6)] transition disabled:opacity-50 disabled:saturate-50 max-lg:hidden"
          aria-label="Крутить"
        >
          <span className="flex flex-col items-center">
            <RotateCw className={cn('size-8', spinning && 'animate-spin')} strokeWidth={2.6} />
            <span className="font-display text-xs font-black tracking-wider uppercase">{spinning ? 'Крутим' : 'Крутить'}</span>
          </span>
        </motion.button>
        <Button variant="gold" size="xl" icon={RotateCw} sound={false} className="lg:hidden" disabled={spinning || totalBet > balance} onClick={() => void spin()}>
          {spinning ? 'Крутим…' : `Крутить · ${formatChips(totalBet)}`}
        </Button>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={autoLeft > 0 ? 'violet' : 'glass'}
            size="sm"
            icon={Repeat}
            onClick={() => setAutoLeft((n) => (n > 0 ? 0 : 10))}
            aria-pressed={autoLeft > 0}
          >
            {autoLeft > 0 ? `Стоп (${autoLeft})` : 'Авто ×10'}
          </Button>
          <Button variant={turbo ? 'cyan' : 'glass'} size="sm" icon={Zap} onClick={() => setTurbo((t) => !t)} aria-pressed={turbo}>
            Турбо
          </Button>
          <Button variant="glass" size="sm" icon={Info} onClick={() => setPaytableOpen(true)}>
            Выплаты
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center max-lg:hidden">
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[10px] text-slate-500">Последний выигрыш</p>
            <p className="font-bold text-white tabular-nums">{formatChips(lastWin)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2">
            <p className="text-[10px] text-slate-500">Множитель</p>
            <p className="font-bold text-white tabular-nums">{lastWin ? formatMultiplier(lastWin / totalBet, 1) : '—'}</p>
          </div>
        </div>
      </Panel>
      <Paytable open={paytableOpen} onClose={() => setPaytableOpen(false)} />
    </div>
  )
}
