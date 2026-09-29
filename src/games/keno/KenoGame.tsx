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

  const [bet, setBet] = useState(10)
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
      toast({ kind: 'warning', title: 'Недостатньо фішок' })
      return
    }
    const result = drawNumbers()
    const h = result.filter((n) => picks.includes(n)).length
    const mult = kenoMultiplier(picks.length, h)
    const payout = Math.floor(bet * mult)
    const roundId = useCasino.getState().startRound('keno', bet, {
      payout,
      tags: h >= 7 ? ['keno-7'] : undefined,
      detail: `Вгадано ${h} з ${picks.length}`,
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
      title: `Вгадано ${h} з ${picks.length}`,
      amount: payout - bet,
      multiplier: mult || undefined,
    })
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
      <Panel strong className="relative overflow-hidden bg-[linear-gradient(180deg,#0b0f16,#07090d)] p-3 sm:p-6 lg:col-start-2 lg:row-start-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(34,225,255,0.1),transparent)]" />
        <div className="relative mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span className="text-slate-400">
            Обрано <b className="num text-white">{picks.length}</b> з {MAX_PICKS}
          </span>
          <span className="text-slate-400">
            Збігів <b className="num text-neon-emerald">{hits}</b> · кульок <span className="num">{drawn.length}/10</span>
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
                aria-label={`Число ${n}${picked ? ', обрано' : ''}${isDrawn ? ', випало' : ''}`}
                className={cn(
                  'num relative grid aspect-square place-items-center rounded-lg text-[13px] font-bold transition-colors sm:rounded-xl sm:text-base',
                  hit && 'bg-[radial-gradient(circle,#8dffd6,#0bbf7e)] text-[#03140d] shadow-glow-green',
                  picked && !isDrawn && 'bg-[linear-gradient(180deg,#fff0c2,#d9a73e)] text-[#1b1204] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_3px_0_#6e4a0e,0_0_14px_rgba(230,194,106,0.4)]',
                  !picked && isDrawn && 'bg-neon-cyan/15 text-cyan-100 ring-2 ring-neon-cyan/60',
                  !picked && !isDrawn && 'border border-white/[0.07] bg-[linear-gradient(180deg,#1f2735,#161c27)] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_3px_0_#0a0d13] hover:border-neon-emerald/40 hover:text-white',
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
                'num grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold shadow-lg sm:size-9',
                picks.includes(n) ? 'bg-[radial-gradient(circle_at_35%_30%,#d9fff1,#0bbf7e)] text-[#03140d]' : 'bg-[radial-gradient(circle_at_35%_30%,#e3fcff,#0a9cc0)] text-ink-950',
              )}
            >
              {n}
            </motion.span>
          ))}
          {drawn.length === 0 && <span className="text-xs text-slate-500">Кульки тиражу з’являться тут</span>}
        </div>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="flex flex-col gap-4 p-4 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
        <BetInput value={bet} onChange={setBet} min={1} disabled={drawing} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="glass" icon={Shuffle} disabled={drawing} onClick={() => (setDrawn([]), setFinished(false), setPicks(quickPick(picks.length || MAX_PICKS)))}>
            Випадково
          </Button>
          <Button variant="glass" icon={Eraser} disabled={drawing || picks.length === 0} onClick={() => (setPicks([]), setDrawn([]), setFinished(false))}>
            Очистити
          </Button>
        </div>
        <div>
          <p className="eyebrow mb-1.5">
            {picks.length ? `Виплати за ${picks.length} ${plural(picks.length, ['число', 'числа', 'чисел'])}` : 'Таблиця виплат'}
          </p>
          {picks.length === 0 ? (
            <p className="well rounded-xl p-3 text-xs text-slate-500">Оберіть від 1 до 10 чисел на полі.</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(table).map(([h, m]) => {
                const active = finished && Number(h) === hits
                return (
                  <div key={h} className={cn('flex items-center justify-between rounded-lg px-3 py-1.5 text-xs', active ? 'bg-neon-emerald/15 ring-1 ring-neon-emerald/50' : 'bg-white/[0.025]')}>
                    <span className="text-slate-300">
                      {h} {plural(Number(h), ['збіг', 'збіги', 'збігів'])}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="num text-slate-500">
                        {hitChance(picks.length, Number(h)) < 0.001 ? '<0,1%' : formatPercent(hitChance(picks.length, Number(h)), 1)}
                      </span>
                      <b className="num w-14 text-right text-gold-200">{multLabel(m)}</b>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <Button variant="emerald" size="xl" icon={Grid3x3} sound={false} disabled={drawing || picks.length === 0 || bet > balance} onClick={() => void play()}>
          {drawing ? 'Тираж…' : 'Почати тираж'}
        </Button>
      </Panel>
    </div>
  )
}
