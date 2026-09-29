import { ArrowDown, ArrowUp, Dices, Equal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { useMountedRef } from '../../hooks/useMounted'
import { useResultBanner } from '../../hooks/useResultBanner'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { wait } from '../../lib/async'
import { cn } from '../../lib/cn'
import { formatDecimal, formatPercent } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { toast } from '../../store/toasts'
import { Die3D } from './Die3D'
import {
  CRAPS_LABELS,
  crapsPayout,
  HILO_LABELS,
  HILO_PAYOUT,
  hiloChance,
  hiloWins,
  playCraps,
  rollDice,
  sumOf,
  type CrapsBet,
  type HiLoPick,
  type Roll,
} from './logic'

type Mode = 'hilo' | 'craps'

const HILO_ICONS = { under: ArrowDown, seven: Equal, over: ArrowUp }
const ROLL_MS = 1250

export default function DiceGame() {
  const balance = useCasino((s) => s.balance)
  const guard = useRoundGuard()
  const mounted = useMountedRef()
  const [banner, showBanner] = useResultBanner(2400)

  const [mode, setMode] = useState<Mode>('hilo')
  const [bet, setBet] = useState(10)
  const [pick, setPick] = useState<HiLoPick>('over')
  const [crapsBet, setCrapsBet] = useState<CrapsBet>('pass')
  const [dice, setDice] = useState<Roll>([3, 4])
  const [rollId, setRollId] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [point, setPoint] = useState<number | null>(null)
  const [history, setHistory] = useState<{ id: number; roll: Roll }[]>([])
  const [shown, setShown] = useState<number | null>(null)

  const throwDice = async (roll: Roll) => {
    setDice(roll)
    setRollId((n) => n + 1)
    setShown(null)
    sfx.play('dice')
    await wait(ROLL_MS)
    if (!mounted.current) return
    sfx.play('reelStop', { pitch: 1.3 })
    setShown(sumOf(roll))
    setHistory((h) => [{ id: Date.now() + Math.random(), roll }, ...h].slice(0, 14))
  }

  const play = async () => {
    if (rolling) return
    if (bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостатньо фішок' })
      return
    }
    const startRound = useCasino.getState().startRound

    if (mode === 'hilo') {
      const roll = rollDice()
      const win = hiloWins(pick, sumOf(roll))
      const payout = win ? Math.floor(bet * HILO_PAYOUT[pick]) : 0
      const roundId = startRound('dice', bet, { payout, detail: `${HILO_LABELS[pick]} · випало ${sumOf(roll)}` })
      if (!roundId) return
      guard.track(roundId)
      setRolling(true)
      setPoint(null)
      await throwDice(roll)
      if (!mounted.current) return
      guard.finish(roundId)
      setRolling(false)
      showBanner({
        kind: win ? (pick === 'seven' ? 'bigwin' : 'win') : 'lose',
        title: win ? `Випало ${sumOf(roll)}!` : `Випало ${sumOf(roll)}`,
        amount: payout - bet,
        multiplier: win ? HILO_PAYOUT[pick] : undefined,
      })
      return
    }

    const round = playCraps(crapsBet)
    const payout = crapsPayout(bet, round.result)
    const roundId = startRound('dice', bet, {
      payout,
      tags: crapsBet === 'pass' && round.point !== null && round.result === 'win' ? ['craps-point'] : undefined,
      detail: `${CRAPS_LABELS[crapsBet]} · ${round.point ? `пойнт ${round.point}` : `перший кидок ${sumOf(round.rolls[0])}`}`,
    })
    if (!roundId) return
    guard.track(roundId)
    setRolling(true)
    setPoint(null)
    for (let i = 0; i < round.rolls.length; i++) {
      await throwDice(round.rolls[i])
      if (!mounted.current) return
      if (i === 0 && round.point !== null) {
        setPoint(round.point)
        sfx.play('ping')
      }
      if (i < round.rolls.length - 1) await wait(450)
    }
    guard.finish(roundId)
    setRolling(false)
    const title = round.result === 'win' ? (round.point ? 'Пойнт узято!' : 'Натурал!') : round.result === 'push' ? 'Повернення ставки' : round.point ? 'Сімка — програш' : 'Крепс!'
    showBanner({
      kind: round.result === 'win' ? 'win' : round.result === 'push' ? 'push' : 'lose',
      title,
      amount: payout - bet,
      subtitle: `Кидків: ${round.rolls.length}`,
    })
  }

  const sum = shown

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 space-y-3 sm:space-y-4 lg:col-start-2 lg:row-start-1">
        <Panel strong className="felt relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,107,139,0.1),transparent)]" />
          <div className="relative flex min-h-[300px] flex-col items-center justify-center gap-6">
            {mode === 'craps' && (
              <div className="absolute top-0 left-0 flex items-center gap-2">
                <motion.span
                  animate={{ scale: point ? [1.3, 1.05] : 1 }}
                  className={cn(
                    'grid size-14 place-items-center rounded-full border-4 text-[10px] font-black uppercase shadow-lg',
                    point ? 'border-white bg-white text-ink-950' : 'border-slate-700 bg-ink-950 text-slate-400',
                  )}
                >
                  {point ? 'Увімк' : 'Вимк'}
                </motion.span>
                <div>
                  <p className="eyebrow text-[10px]">Пойнт</p>
                  <p className="num text-2xl font-bold text-white">{point ?? '—'}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-8 sm:gap-14">
              <Die3D value={dice[0]} rollId={rollId} tone="ivory" />
              <Die3D value={dice[1]} rollId={rollId} tone="ruby" delay={0.08} />
            </div>

            <div className="h-16 text-center">
              <AnimatePresence mode="wait">
                {sum !== null ? (
                  <motion.div key={`${rollId}`} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="eyebrow tracking-[0.3em]">Сума</p>
                    <p className="num text-5xl font-bold text-gold-gradient">{sum}</p>
                  </motion.div>
                ) : (
                  <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 text-sm text-slate-400">
                    {rolling ? 'Кістки летять…' : 'Зробіть ставку й кидайте'}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
          <ResultBanner result={banner} />
        </Panel>

        <Panel className="flex items-center gap-3 overflow-hidden p-3">
          <span className="eyebrow shrink-0">Кидки</span>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {history.length === 0 && <span className="text-xs text-slate-500">Поки порожньо</span>}
            {history.map((h, i) => {
              const s = sumOf(h.roll)
              return (
                <motion.span
                  key={h.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1 - i * 0.05, x: 0 }}
                  className={cn(
                    'num grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold ring-1',
                    s === 7 ? 'bg-gold-400/15 text-gold-200 ring-gold-300/40' : s > 7 ? 'bg-neon-emerald/10 text-neon-emerald ring-neon-emerald/25' : 'bg-neon-cyan/10 text-neon-cyan ring-neon-cyan/25',
                  )}
                  title={`${h.roll[0]} + ${h.roll[1]}`}
                >
                  {s}
                </motion.span>
              )
            })}
          </div>
        </Panel>
      </div>

      <Panel strong className="flex flex-col gap-4 p-4 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
        <SegmentedControl
          value={mode}
          onChange={(m) => {
            setMode(m)
            setPoint(null)
          }}
          disabled={rolling}
          options={[
            { value: 'hilo', label: 'Більше/Менше' },
            { value: 'craps', label: 'Крепс-лайт' },
          ]}
          label="Режим гри"
        />
        <BetInput value={bet} onChange={setBet} min={1} disabled={rolling} />

        {mode === 'hilo' ? (
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Прогноз">
            {(['under', 'seven', 'over'] as const).map((p) => {
              const Icon = HILO_ICONS[p]
              const active = pick === p
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={rolling}
                  onClick={() => (sfx.play('click'), setPick(p))}
                  className={cn(
                    'flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-3 transition disabled:opacity-60',
                    active ? 'border-neon-emerald/60 bg-neon-emerald/10 shadow-[0_0_20px_-6px_rgba(25,245,163,0.7)]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]',
                  )}
                >
                  <Icon className={cn('size-5', active ? 'text-neon-emerald' : 'text-slate-400')} />
                  <span className="text-xs font-bold text-white">{HILO_LABELS[p]}</span>
                  <span className="num text-[10px] text-slate-400">
                    ×{formatDecimal(HILO_PAYOUT[p])} · {formatPercent(hiloChance(p), 0)}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Ставка крепсу">
            {(['pass', 'dontpass'] as const).map((b) => {
              const active = crapsBet === b
              return (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={rolling}
                  onClick={() => (sfx.play('click'), setCrapsBet(b))}
                  className={cn(
                    'min-w-0 rounded-xl border px-3 py-3 text-left transition disabled:opacity-60',
                    active ? 'border-neon-emerald/60 bg-neon-emerald/10 shadow-[0_0_20px_-6px_rgba(25,245,163,0.7)]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]',
                  )}
                >
                  <p className="text-sm font-bold text-white">{CRAPS_LABELS[b]}</p>
                  <p className="text-[10px] leading-snug text-slate-400">
                    {b === 'pass' ? '7 або 11 одразу — перемога; далі пойнт раніше за сімку' : '2 або 3 одразу — перемога; далі сімка раніше за пойнт'}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        <Button variant="emerald" size="xl" icon={Dices} sound={false} disabled={rolling || bet > balance} onClick={() => void play()}>
          {rolling ? 'Кидаємо…' : 'Кинути кістки'}
        </Button>
        <p className="text-center text-[11px] text-slate-500">
          {mode === 'hilo' ? 'Один кидок — миттєвий результат.' : 'Кидки йдуть автоматично, доки ставка не зіграє. Виплата 1 до 1.'}
        </p>
      </Panel>
    </div>
  )
}
