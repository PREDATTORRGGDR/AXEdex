import { Target } from 'lucide-react'
import { animate, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { useMountedRef } from '../../hooks/useMounted'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { cn } from '../../lib/cn'
import { formatChips, formatDecimal, formatMultiplier, formatPercent } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { celebrate } from '../../store/fx'
import { toast } from '../../store/toasts'
import { clampTarget, limboResult, MAX_TARGET, MIN_TARGET, targetForChance, winChance } from './logic'

const PRESETS = [1.5, 2, 5, 10, 100, 1000]

export default function LimboGame() {
  const balance = useCasino((s) => s.balance)
  const guard = useRoundGuard()
  const mounted = useMountedRef()
  const numberRef = useRef<HTMLSpanElement>(null)

  const [bet, setBet] = useState(10)
  const [target, setTarget] = useState(2)
  const [targetDraft, setTargetDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<{ value: number; win: boolean } | null>(null)
  const [history, setHistory] = useState<{ id: number; value: number; win: boolean }[]>([])

  useEffect(() => {
    if (numberRef.current && !busy && !outcome) numberRef.current.textContent = formatMultiplier(1)
  }, [busy, outcome])

  const play = async () => {
    if (busy) return
    if (bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостатньо фішок' })
      return
    }
    const value = limboResult()
    const win = value >= target
    const payout = win ? Math.floor(bet * target) : 0
    const roundId = useCasino.getState().startRound('limbo', bet, {
      payout,
      tags: win && target >= 100 ? ['limbo-100'] : undefined,
      detail: `Ціль ${formatMultiplier(target)} · випало ${formatMultiplier(value)}`,
    })
    if (!roundId) return
    guard.track(roundId)
    setBusy(true)
    setOutcome(null)
    sfx.play('whoosh')
    const shown = Math.min(value, 100_000)
    await animate(1, shown, {
      duration: Math.min(1.1, 0.35 + Math.log10(shown + 1) * 0.25),
      ease: [0.2, 0.8, 0.3, 1],
      onUpdate: (v) => {
        if (numberRef.current) numberRef.current.textContent = formatMultiplier(v)
      },
    })
    if (!mounted.current) return
    if (numberRef.current) numberRef.current.textContent = formatMultiplier(value)
    guard.finish(roundId)
    setOutcome({ value, win })
    setHistory((h) => [{ id: Date.now(), value, win }, ...h].slice(0, 20))
    setBusy(false)
    if (win) {
      sfx.play(target >= 10 ? 'bigWin' : 'win')
      haptic(25)
      if (target >= 10) celebrate('coins', Math.min(3, target / 20 + 1))
    } else {
      sfx.play('lose')
    }
  }

  const commitTarget = (raw: string) => {
    const v = Number(raw.replace(',', '.'))
    if (Number.isFinite(v) && v > 0) setTarget(clampTarget(v))
    setTargetDraft(null)
  }

  const chance = winChance(target)

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 space-y-3 sm:space-y-4 lg:col-start-2 lg:row-start-1">
        <Panel strong className="relative overflow-hidden bg-[linear-gradient(180deg,#0b0f16,#07090d)] p-6 sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_40%,rgba(157,123,255,0.16),transparent)]" />
          <div className="relative flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            <p className="eyebrow tracking-[0.3em]">Результат</p>
            <motion.span
              ref={numberRef}
              animate={outcome ? { scale: [1.25, 1] } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              className={cn(
                'num text-6xl font-bold sm:text-8xl',
                !outcome && 'text-white [text-shadow:0_0_30px_rgba(157,123,255,0.6)]',
                outcome?.win && 'text-neon-emerald text-glow-green',
                outcome && !outcome.win && 'text-neon-red [text-shadow:0_0_30px_rgba(255,77,109,0.6)]',
              )}
            >
              {formatMultiplier(1)}
            </motion.span>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="well rounded-lg px-3 py-1 text-slate-400">
                Ціль <b className="num text-white">{formatMultiplier(target)}</b>
              </span>
              {outcome && (
                <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('num rounded-lg px-3 py-1 font-bold ring-1', outcome.win ? 'bg-neon-emerald/10 text-neon-emerald ring-neon-emerald/30' : 'bg-neon-red/10 text-neon-red ring-neon-red/30')}>
                  {outcome.win ? `Виграш +${formatChips(Math.floor(bet * target) - bet)}` : `Програш −${formatChips(bet)}`}
                </motion.span>
              )}
            </div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3 overflow-hidden p-3">
          <span className="eyebrow shrink-0">Історія</span>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {history.length === 0 && <span className="text-xs text-slate-500">Поки порожньо</span>}
            {history.map((h) => (
              <motion.span key={h.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className={cn('num shrink-0 rounded-md px-2 py-1 text-xs font-bold ring-1', h.win ? 'bg-neon-emerald/10 text-neon-emerald ring-neon-emerald/30' : 'bg-white/[0.03] text-slate-400 ring-white/10')}>
                {formatMultiplier(h.value)}
              </motion.span>
            ))}
          </div>
        </Panel>
      </div>

      <Panel strong className="flex flex-col gap-4 p-4 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
        <BetInput value={bet} onChange={setBet} min={1} disabled={busy} />
        <div className="grid grid-cols-2 gap-2">
          <label className="min-w-0 space-y-1.5">
            <span className="eyebrow block truncate">Ціль</span>
            <input
              inputMode="decimal"
              value={targetDraft ?? formatDecimal(target)}
              disabled={busy}
              onChange={(e) => setTargetDraft(e.target.value)}
              onBlur={() => targetDraft !== null && commitTarget(targetDraft)}
              onKeyDown={(e) => e.key === 'Enter' && targetDraft !== null && commitTarget(targetDraft)}
              className="field num h-11 w-full rounded-xl px-3 text-base font-bold"
            />
          </label>
          <label className="min-w-0 space-y-1.5">
            <span className="eyebrow block truncate">Шанс перемоги</span>
            <div className="field num flex h-11 items-center rounded-xl px-3 text-base font-bold !text-neon-emerald">{formatPercent(chance, 2)}</div>
          </label>
        </div>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round((Math.log(target) / Math.log(MAX_TARGET)) * 1000)}
          disabled={busy}
          onChange={(e) => setTarget(clampTarget(Math.max(MIN_TARGET, Math.exp((Number(e.target.value) / 1000) * Math.log(MAX_TARGET)))))}
          className="w-full accent-neon-violet"
          aria-label="Цільовий множник"
        />
        <div className="grid grid-cols-6 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => (sfx.play('click'), setTarget(p))}
              data-on={target === p}
              className="preset num h-8 rounded-lg text-[11px]"
            >
              {formatDecimal(p, p % 1 ? 1 : 0)}×
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button type="button" disabled={busy} className="preset h-8 rounded-lg" onClick={() => setTarget(targetForChance(0.5))}>
            Шанс 50%
          </button>
          <button type="button" disabled={busy} className="preset h-8 rounded-lg" onClick={() => setTarget(targetForChance(0.1))}>
            Шанс 10%
          </button>
        </div>
        <div className="well flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs">
          <span className="text-slate-400">Виграш у разі перемоги</span>
          <b className="num text-gold-200">{formatChips(Math.floor(bet * target))}</b>
        </div>
        <Button variant="emerald" size="xl" icon={Target} sound={false} disabled={busy || bet > balance} onClick={() => void play()}>
          {busy ? 'Рахуємо…' : 'Грати'}
        </Button>
      </Panel>
    </div>
  )
}
