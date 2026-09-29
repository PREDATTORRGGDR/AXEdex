import { Eraser, Grid3x3, Shuffle } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { useMountedRef } from '../../hooks/useMounted'
import { useResultBanner } from '../../hooks/useResultBanner'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { wait } from '../../lib/async'
import { cn } from '../../lib/cn'
import { formatDecimal, formatPercent, plural } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { toast } from '../../store/toasts'
import { drawNumbers, hitChance, KENO_NUMBERS, KENO_PAYTABLE, kenoMultiplier, MAX_PICKS, quickPick } from './logic'

const multLabel = (m: number) => `${formatDecimal(m, m % 1 ? 1 : 0)}×`

export default function KenoGame() {
  const balance = useCasino((s) => s.balance)
  const guard = useRoundGuard()
  const mounted = useMountedRef()
  const [banner, showBanner] = useResultBanner(2600)

  const [bet, setBet] = useState(100)
  const [picks, setPicks] = useState<number[]>([])
  const [drawn, setDrawn] = useState<number[]>([])
  const [drawing, setDrawing] = useState(false)
  const [finished, setFinished] = useState(false)

  const hits = drawn.filter((n) => picks.includes(n)).length
  const table = KENO_PAYTABLE[picks.length] ?? {}

  const toggle = (n: number) => {
    if (drawing) return
    if (finished) {
      setDrawn([])
      setFinished(false)
    }
    if (picks.includes(n)) {
      sfx.play('click', { pitch: 0.8 })
      setPicks((p) => p.filter((x) => x !== n))
    } else if (picks.length < MAX_PICKS) {
      sfx.play('chip', { pitch: 1 + picks.length * 0.04 })
      setPicks((p) => [...p, n])
    } else {
      sfx.play('error')
    }
  }

  const play = async () => {
    if (drawing || picks.length === 0) return
    if (bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостаточно фишек' })
      return
    }
    const result = drawNumbers()
    const h = result.filter((n) => picks.includes(n)).length
    const mult = kenoMultiplier(picks.length, h)
    const payout = Math.floor(bet * mult)
    const roundId = useCasino.getState().startRound('keno', bet, {
      payout,
      tags: h >= 7 ? ['keno-7'] : undefined,
      detail: `Угадано ${h} из ${picks.length}`,
    })
    if (!roundId) return
    guard.track(roundId)
    setDrawing(true)
    setFinished(false)
    setDrawn([])
    let found = 0
    for (const n of result) {
      await wait(190)
      if (!mounted.current) return
      const hit = picks.includes(n)
      if (hit) found++
      sfx.play(hit ? 'gem' : 'ping', { pitch: hit ? 1 + found * 0.08 : 0.8 })
      setDrawn((d) => [...d, n])
    }
    await wait(300)
    guard.finish(roundId)
    setDrawing(false)
    setFinished(true)
    showBanner({
      kind: mult >= 10 ? 'bigwin' : payout > bet ? 'win' : payout === bet ? 'push' : 'lose',
      title: `Угадано ${h} из ${picks.length}`,
      amount: payout - bet,
      multiplier: mult || undefined,
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel strong className="relative overflow-hidden p-3 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(45,212,191,0.14),transparent)]" />
        <div className="relative mb-3 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Выбрано <b className="text-white">{picks.length}</b> из {MAX_PICKS}
          </span>
          <span className="text-slate-400">
            Совпадений <b className="text-emerald-300">{hits}</b> · шаров {drawn.length}/10
          </span>
        </div>
        <div className="relative grid grid-cols-8 gap-1.5 sm:gap-2">
          {Array.from({ length: KENO_NUMBERS }, (_, i) => {
            const n = i + 1
            const picked = picks.includes(n)
            const isDrawn = drawn.includes(n)
            const hit = picked && isDrawn
            return (
              <motion.button
                key={n}
                type="button"
                onClick={() => toggle(n)}
                disabled={drawing}
                whileTap={{ scale: 0.9 }}
                animate={isDrawn ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                aria-pressed={picked}
                aria-label={`Число ${n}${picked ? ', выбрано' : ''}${isDrawn ? ', выпало' : ''}`}
                className={cn(
                  'relative grid aspect-square place-items-center rounded-xl text-sm font-black tabular-nums transition-colors sm:text-base',
                  hit && 'bg-[radial-gradient(circle,#6ee7b7,#059669)] text-ink-950 shadow-glow-green',
                  picked && !isDrawn && 'bg-[linear-gradient(180deg,#fff0bd,#e2ab1c)] text-ink-950 shadow-[0_0_14px_rgba(252,217,107,0.45)]',
                  !picked && isDrawn && 'bg-cyan-500/25 text-cyan-100 ring-2 ring-cyan-300/60',
                  !picked && !isDrawn && 'bg-white/[0.05] text-slate-300 ring-1 ring-white/10 hover:bg-white/[0.1]',
                  finished && !picked && !isDrawn && 'opacity-50',
                )}
              >
                {n}
              </motion.button>
            )
          })}
        </div>
        <div className="relative mt-4 flex min-h-11 flex-wrap items-center gap-1.5">
          {drawn.map((n) => (
            <motion.span
              key={n}
              initial={{ y: -30, opacity: 0, scale: 0.4 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full text-xs font-black shadow-lg sm:size-9',
                picks.includes(n) ? 'bg-[radial-gradient(circle_at_35%_30%,#d1fae5,#10b981)] text-ink-950' : 'bg-[radial-gradient(circle_at_35%_30%,#e0f2fe,#0891b2)] text-ink-950',
              )}
            >
              {n}
            </motion.span>
          ))}
          {drawn.length === 0 && <span className="text-xs text-slate-500">Шары тиража появятся здесь</span>}
        </div>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="flex flex-col gap-4 p-4 lg:self-start">
        <BetInput value={bet} onChange={setBet} min={1} disabled={drawing} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="glass" icon={Shuffle} disabled={drawing} onClick={() => (setDrawn([]), setFinished(false), setPicks(quickPick(picks.length || MAX_PICKS)))}>
            Случайно
          </Button>
          <Button variant="glass" icon={Eraser} disabled={drawing || picks.length === 0} onClick={() => (setPicks([]), setDrawn([]), setFinished(false))}>
            Очистить
          </Button>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-400">
            {picks.length ? `Выплаты за ${picks.length} ${plural(picks.length, ['число', 'числа', 'чисел'])}` : 'Таблица выплат'}
          </p>
          {picks.length === 0 ? (
            <p className="rounded-xl bg-white/[0.03] p-3 text-xs text-slate-500">Выберите от 1 до 10 чисел на поле.</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(table).map(([h, m]) => {
                const active = finished && Number(h) === hits
                return (
                  <div key={h} className={cn('flex items-center justify-between rounded-lg px-3 py-1.5 text-xs', active ? 'bg-emerald-400/20 ring-1 ring-emerald-300/50' : 'bg-white/[0.03]')}>
                    <span className="text-slate-300">
                      {h} {plural(Number(h), ['совпадение', 'совпадения', 'совпадений'])}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-slate-500 tabular-nums">
                        {hitChance(picks.length, Number(h)) < 0.001 ? '<0,1%' : formatPercent(hitChance(picks.length, Number(h)), 1)}
                      </span>
                      <b className="w-14 text-right text-gold-200 tabular-nums">{multLabel(m)}</b>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <Button variant="gold" size="xl" icon={Grid3x3} sound={false} disabled={drawing || picks.length === 0 || bet > balance} onClick={() => void play()}>
          {drawing ? 'Тираж…' : 'Начать тираж'}
        </Button>
      </Panel>
    </div>
  )
}
