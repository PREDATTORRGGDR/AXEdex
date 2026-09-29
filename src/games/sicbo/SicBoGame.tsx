import { Dices } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { sfx } from '../../audio/sfx'
import { BetSpot } from '../../components/game/BetSpot'
import { ChipTableControls } from '../../components/game/ChipTableControls'
import { DieFace } from '../../components/game/DieFace'
import { ResultBanner } from '../../components/game/ResultBanner'
import { Panel } from '../../components/ui/Panel'
import { useChipBets } from '../../hooks/useChipBets'
import { useMountedRef } from '../../hooks/useMounted'
import { useResultBanner, resultKind } from '../../hooks/useResultBanner'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { wait } from '../../lib/async'
import { cn } from '../../lib/cn'
import { useCasino } from '../../store/casino'
import { Die3D } from '../dice/Die3D'
import { betLabel, isTriple, rollThree, sicBoPayout, sumOf3, TOTAL_ODDS, type SicBoBet, type SicBoRoll } from './logic'

const SIX = [1, 2, 3, 4, 5, 6] as const
const TOTALS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const

export default function SicBoGame() {
  const guard = useRoundGuard()
  const mounted = useMountedRef()
  const [banner, showBanner] = useResultBanner(2600)
  const chips = useChipBets<SicBoBet>()
  const [chip, setChip] = useState(5)
  const [busy, setBusy] = useState(false)
  const [roll, setRoll] = useState<SicBoRoll>([1, 3, 5])
  const [rollId, setRollId] = useState(0)
  const [result, setResult] = useState<SicBoRoll | null>(null)
  const [history, setHistory] = useState<{ id: number; roll: SicBoRoll }[]>([])
  const [lastWin, setLastWin] = useState(0)

  const play = async () => {
    if (busy || chips.total <= 0) return
    const r = rollThree()
    const bets = chips.bets
    let payout = 0
    const winning: SicBoBet[] = []
    for (const [k, v] of Object.entries(bets) as [SicBoBet, number][]) {
      const p = sicBoPayout(k, v, r)
      payout += p
      if (p > 0) winning.push(k)
    }
    const stake = chips.total
    const specificTriple = winning.some((k) => k.startsWith('triple'))
    const roundId = useCasino.getState().startRound('sicbo', stake, {
      payout,
      tags: specificTriple ? ['sicbo-triple'] : undefined,
      detail: `${r.join('-')} · сума ${sumOf3(r)}`,
    })
    if (!roundId) return
    guard.track(roundId)
    chips.commit()
    setBusy(true)
    setResult(null)
    setRoll(r)
    setRollId((n) => n + 1)
    sfx.play('dice')
    await wait(1350)
    if (!mounted.current) return
    sfx.play('reelStop', { pitch: 1.3 })
    guard.finish(roundId)
    setResult(r)
    setHistory((h) => [{ id: Date.now(), roll: r }, ...h].slice(0, 12))
    setLastWin(payout)
    chips.reset()
    setBusy(false)
    showBanner({
      kind: resultKind(stake, payout),
      title: isTriple(r) ? `Трійка ${r[0]}!` : `Сума ${sumOf3(r)}`,
      amount: payout - stake,
      subtitle: r.join(' · '),
    })
  }

  // After a roll, light up every spot that would have paid.
  const state = (k: SicBoBet) => (result && sicBoPayout(k, 1, result) > 0 ? 'win' : null)
  const spot = (k: SicBoBet, label: React.ReactNode, odds: string, extra?: { tone?: 'gold' | 'red' | 'blue' | 'green' | 'felt'; className?: string; compact?: boolean }) => (
    <BetSpot
      key={k}
      label={label}
      ariaLabel={betLabel(k)}
      odds={odds}
      amount={chips.bets[k]}
      disabled={busy}
      state={state(k)}
      tone={extra?.tone ?? 'felt'}
      compact={extra?.compact ?? true}
      className={extra?.className}
      onClick={() => {
        if (result) setResult(null)
        chips.place(k, chip)
      }}
    />
  )

  return (
    <div className="space-y-3 sm:space-y-4">
      <Panel strong className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(90%_70%_at_50%_0%,rgba(255,207,90,0.12),transparent),linear-gradient(180deg,#1c0b10,#07090d)] p-3 sm:p-6">
        <div className="flex flex-col items-center gap-4 pb-4">
          <div className="flex items-center gap-5 sm:gap-10">
            {roll.map((v, i) => (
              <Die3D key={i} value={v} rollId={rollId} size={64} tone={i === 1 ? 'ruby' : 'ivory'} delay={i * 0.06} />
            ))}
          </div>
          <div className="h-8 text-center">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.p key={rollId} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="font-display text-xl font-black text-gold-gradient">
                  Сума {sumOf3(result)}
                  {isTriple(result) && ' · трійка!'}
                </motion.p>
              ) : (
                <motion.p key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-400">
                  {busy ? 'Кістки в чаші…' : 'Розкладіть фішки й кидайте'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 sm:gap-2">
            {spot('small', 'Мале', '4–10 · 1:1', { tone: 'blue', compact: false, className: 'order-1 max-sm:min-h-16' })}
            {spot('odd', 'Непарне', '1:1', { compact: false, className: 'order-3 sm:order-2 max-sm:min-h-16' })}
            {spot('anyTriple', 'Будь-яка трійка', '30:1', { tone: 'gold', compact: false, className: 'order-5 col-span-2 sm:order-3 sm:col-span-1 max-sm:min-h-14' })}
            {spot('even', 'Парне', '1:1', { compact: false, className: 'order-4 max-sm:min-h-16' })}
            {spot('big', 'Велике', '11–17 · 1:1', { tone: 'red', compact: false, className: 'order-2 sm:order-5 max-sm:min-h-16' })}
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {SIX.map((n) =>
              spot(
                `triple${n}`,
                <span className="flex -space-x-1 sm:space-x-0.5">
                  {[0, 1, 2].map((i) => (
                    <DieFace key={i} value={n} size={16} className="sm:size-5" />
                  ))}
                </span>,
                '180:1',
                { tone: 'gold' },
              ),
            )}
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 xl:grid-cols-14">
            {TOTALS.map((t) => spot(`total${t}`, t, `${TOTAL_ODDS[t]}:1`))}
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {SIX.map((n) => spot(`single${n}`, <DieFace value={n} size={24} className="sm:size-7" />, '1–3:1', { tone: 'green' }))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-hidden">
          <span className="eyebrow shrink-0 text-[10px]">Кидки</span>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {history.length === 0 && <span className="text-xs text-slate-500">Поки порожньо</span>}
            {history.map((h) => (
              <span key={h.id} className={cn('num shrink-0 rounded-md px-2 py-1 text-xs font-bold ring-1', isTriple(h.roll) ? 'bg-gold-400/15 text-gold-200 ring-gold-300/40' : sumOf3(h.roll) <= 10 ? 'bg-neon-cyan/10 text-cyan-100 ring-neon-cyan/30' : 'bg-neon-red/10 text-rose-100 ring-neon-red/30')}>
                {h.roll.join('·')} = {sumOf3(h.roll)}
              </span>
            ))}
          </div>
        </div>
        <ResultBanner result={banner} />
      </Panel>

      <ChipTableControls
        chip={chip}
        onChip={(v) => (sfx.play('chip'), setChip(v))}
        total={chips.total}
        lastWin={lastWin}
        busy={busy}
        canUndo={chips.history.length > 0}
        canRebet={Object.keys(chips.last).length > 0}
        onUndo={chips.undo}
        onClear={chips.clear}
        onDouble={chips.double}
        onRebet={() => (setResult(null), chips.rebet())}
        actionLabel="Кинути"
        busyLabel="Кидаємо…"
        actionIcon={Dices}
        onAction={() => void play()}
      />
    </div>
  )
}
