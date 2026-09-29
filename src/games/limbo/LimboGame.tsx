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

  const [bet, setBet] = useState(100)
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
      toast({ kind: 'warning', title: 'Недостаточно фишек' })
      return
    }
    const value = limboResult()
    const win = value >= target
    const payout = win ? Math.floor(bet * target) : 0
    const roundId = useCasino.getState().startRound('limbo', bet, {
      payout,
      tags: win && target >= 100 ? ['limbo-100'] : undefined,
      detail: `Цель ${formatMultiplier(target)} · выпало ${formatMultiplier(value)}`,
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
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-4">
        <Panel strong className="relative overflow-hidden p-6 sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_40%,rgba(129,140,248,0.2),transparent)]" />
          <div className="relative flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            <p className="text-xs font-bold tracking-[0.3em] text-indigo-200/70 uppercase">Результат</p>
            <motion.span
              ref={numberRef}
              animate={outcome ? { scale: [1.25, 1] } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              className={cn(
                'font-display text-6xl font-black tabular-nums sm:text-8xl',
                !outcome && 'text-white [text-shadow:0_0_30px_rgba(129,140,248,0.6)]',
                outcome?.win && 'text-emerald-300 text-glow-green',
                outcome && !outcome.win && 'text-rose-400 [text-shadow:0_0_30px_rgba(255,77,109,0.6)]',
              )}
            >
              {formatMultiplier(1)}
            </motion.span>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-slate-300">
                Цель <b className="text-white tabular-nums">{formatMultiplier(target)}</b>
              </span>
              {outcome && (
                <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('rounded-full px-3 py-1 font-bold tabular-nums', outcome.win ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300')}>
                  {outcome.win ? `Выигрыш +${formatChips(Math.floor(bet * target) - bet)}` : `Проигрыш −${formatChips(bet)}`}
                </motion.span>
              )}
            </div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3 overflow-hidden p-3">
          <span className="shrink-0 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">История</span>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {history.length === 0 && <span className="text-xs text-slate-500">Пока пусто</span>}
            {history.map((h) => (
              <motion.span key={h.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className={cn('shrink-0 rounded-lg px-2 py-1 text-xs font-bold tabular-nums ring-1', h.win ? 'bg-emerald-400/15 text-emerald-300 ring-emerald-300/30' : 'bg-rose-500/15 text-rose-300 ring-rose-400/30')}>
                {formatMultiplier(h.value)}
              </motion.span>
            ))}
          </div>
        </Panel>
      </div>

      <Panel strong className="flex flex-col gap-4 p-4 lg:self-start">
        <BetInput value={bet} onChange={setBet} min={1} disabled={busy} />
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-400">Целевой множитель</span>
            <input
              inputMode="decimal"
              value={targetDraft ?? formatDecimal(target)}
              disabled={busy}
              onChange={(e) => setTargetDraft(e.target.value)}
              onBlur={() => targetDraft !== null && commitTarget(targetDraft)}
              onKeyDown={(e) => e.key === 'Enter' && targetDraft !== null && commitTarget(targetDraft)}
              className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3 text-base font-bold text-white tabular-nums outline-none focus:border-gold-400/60"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-400">Шанс победы</span>
            <div className="flex h-11 items-center rounded-xl border border-white/10 bg-ink-950/60 px-3 text-base font-bold text-emerald-300 tabular-nums">{formatPercent(chance, 2)}</div>
          </label>
        </div>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round((Math.log(target) / Math.log(MAX_TARGET)) * 1000)}
          disabled={busy}
          onChange={(e) => setTarget(clampTarget(Math.max(MIN_TARGET, Math.exp((Number(e.target.value) / 1000) * Math.log(MAX_TARGET)))))}
          className="w-full accent-indigo-400"
          aria-label="Целевой множитель"
        />
        <div className="grid grid-cols-6 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => (sfx.play('click'), setTarget(p))}
              className={cn('h-8 rounded-lg text-[11px] font-bold transition', target === p ? 'bg-indigo-400/25 text-indigo-100 ring-1 ring-indigo-300/50' : 'bg-white/[0.05] text-slate-300 hover:bg-white/10')}
            >
              {formatDecimal(p, p % 1 ? 1 : 0)}×
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button type="button" disabled={busy} className="rounded-lg bg-white/[0.04] py-1.5 text-slate-300 hover:bg-white/10" onClick={() => setTarget(targetForChance(0.5))}>
            Шанс 50%
          </button>
          <button type="button" disabled={busy} className="rounded-lg bg-white/[0.04] py-1.5 text-slate-300 hover:bg-white/10" onClick={() => setTarget(targetForChance(0.1))}>
            Шанс 10%
          </button>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs">
          <span className="text-slate-400">Выигрыш при победе</span>
          <b className="text-gold-200 tabular-nums">{formatChips(Math.floor(bet * target))}</b>
        </div>
        <Button variant="gold" size="xl" icon={Target} sound={false} disabled={busy || bet > balance} onClick={() => void play()}>
          {busy ? 'Считаем…' : 'Играть'}
        </Button>
      </Panel>
    </div>
  )
}
