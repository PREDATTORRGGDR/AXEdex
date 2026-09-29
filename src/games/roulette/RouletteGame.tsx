import { Disc3 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { ChipTableControls } from '../../components/game/ChipTableControls'
import { Panel } from '../../components/ui/Panel'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useResultBanner, resultKind } from '../../hooks/useResultBanner'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { cn } from '../../lib/cn'
import { formatChips, formatPercent } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { persistStorage, STORAGE_PREFIX } from '../../store/storage'
import { toast } from '../../store/toasts'
import {
  colorOf,
  describeNumber,
  isStraight,
  resolveSpin,
  spinNumber,
  totalStake,
  type BetKey,
  type Bets,
} from './logic'
import { RouletteTable } from './RouletteTable'
import { RouletteWheel, type WheelSpin } from './RouletteWheel'

interface RouletteHistory {
  numbers: number[]
  lastBets: Bets
  push: (n: number) => void
  setLastBets: (b: Bets) => void
}

const useRouletteHistory = create<RouletteHistory>()(
  persist(
    (set) => ({
      numbers: [],
      lastBets: {},
      push: (n) => set((s) => ({ numbers: [n, ...s.numbers].slice(0, 100) })),
      setLastBets: (lastBets) => set({ lastBets }),
    }),
    { name: `${STORAGE_PREFIX}:roulette`, storage: persistStorage },
  ),
)

interface ActiveSpin extends WheelSpin {
  roundId: string
  payout: number
  winning: BetKey[]
  stake: number
}

const POCKET_BG = {
  red: 'bg-[linear-gradient(180deg,#e0284a,#a8112f)]',
  black: 'bg-[linear-gradient(180deg,#252c3b,#10141c)]',
  green: 'bg-[linear-gradient(180deg,#12b877,#0a7a4f)]',
}

function HistoryStrip() {
  const numbers = useRouletteHistory((s) => s.numbers)
  const recent = numbers.slice(0, 16)
  const sample = numbers.length || 1
  const red = numbers.filter((n) => colorOf(n) === 'red').length / sample
  const black = numbers.filter((n) => colorOf(n) === 'black').length / sample
  const zero = numbers.filter((n) => n === 0).length / sample

  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase">Останні номери</p>
        <p className="num text-[11px] text-slate-500">{numbers.length} спінів</p>
      </div>
      <div className="no-scrollbar flex h-10 gap-1.5 overflow-x-auto">
        <AnimatePresence initial={false}>
          {recent.length === 0 && <p className="text-sm text-slate-500">Ще жодного спіну</p>}
          {recent.map((n, i) => (
            <motion.span
              key={numbers.length - i}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: i === 0 ? 1.1 : 1, opacity: 1 - i * 0.04 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={cn(
                'num grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white ring-1 ring-white/10',
                POCKET_BG[colorOf(n)],
                i === 0 && 'shadow-[0_0_16px_-2px_rgba(255,207,90,0.7)] ring-2 ring-neon-gold',
              )}
            >
              {n}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      {numbers.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="flex h-2 overflow-hidden rounded-full">
            <div className="bg-roulette-red" style={{ width: `${red * 100}%` }} />
            <div className="bg-slate-500" style={{ width: `${black * 100}%` }} />
            <div className="bg-roulette-green" style={{ width: `${zero * 100}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Червоне <b className="num text-slate-300">{formatPercent(red)}</b></span>
            <span>Зеро <b className="num text-slate-300">{formatPercent(zero)}</b></span>
            <span>Чорне <b className="num text-slate-300">{formatPercent(black)}</b></span>
          </div>
        </div>
      )}
    </Panel>
  )
}

export default function RouletteGame() {
  const balance = useCasino((s) => s.balance)
  const startRound = useCasino((s) => s.startRound)
  const { lastBets, setLastBets, push } = useRouletteHistory()
  const vertical = !useMediaQuery('(min-width: 768px)')
  const guard = useRoundGuard()
  const [banner, showBanner] = useResultBanner(3000)

  const [chip, setChip] = useState(5)
  const [bets, setBets] = useState<Bets>({})
  const [history, setHistory] = useState<Bets[]>([])
  const [spin, setSpin] = useState<ActiveSpin | null>(null)
  const spinRef = useRef<ActiveSpin | null>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const [result, setResult] = useState<{ number: number; winning: BetKey[] } | null>(null)
  const [lastWin, setLastWin] = useState(0)

  const stake = totalStake(bets)
  const spinning = spin !== null

  const place = (key: BetKey) => {
    if (spinning) return
    if (result) setResult(null)
    if (stake + chip > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостатньо фішок', message: 'Зменште номінал фішки або заберіть бонус.' })
      return
    }
    sfx.play('chip', { pitch: 0.9 + Math.random() * 0.2 })
    setHistory((h) => [...h, bets])
    setBets((b) => ({ ...b, [key]: (b[key] ?? 0) + chip }))
  }

  const remove = (key: BetKey) => {
    if (spinning || !bets[key]) return
    sfx.play('click')
    setHistory((h) => [...h, bets])
    setBets((b) => {
      const next = { ...b }
      delete next[key]
      return next
    })
  }

  const undo = () => {
    if (!history.length) return
    setBets(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
  }

  const clear = () => {
    setHistory((h) => [...h, bets])
    setBets({})
  }

  const double = () => {
    if (stake * 2 > balance) {
      sfx.play('error')
      return
    }
    sfx.play('chip')
    setHistory((h) => [...h, bets])
    setBets((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, (v ?? 0) * 2])))
  }

  const rebet = () => {
    const total = totalStake(lastBets)
    if (total > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостатньо фішок для повтору' })
      return
    }
    sfx.play('chip')
    setResult(null)
    setHistory((h) => [...h, bets])
    setBets(lastBets)
  }

  const doSpin = () => {
    if (spinning || stake <= 0) return
    const number = spinNumber()
    const { payout, winningKeys } = resolveSpin(bets, number)
    const tags = winningKeys.some(isStraight) ? (['roulette-straight'] as const) : undefined
    const roundId = startRound('roulette', stake, { payout, tags: tags ? [...tags] : undefined, detail: describeNumber(number) })
    if (!roundId) {
      sfx.play('error')
      return
    }
    guard.track(roundId)
    setLastBets(bets)
    setResult(null)
    const next: ActiveSpin = { id: Date.now(), number, roundId, payout, winning: winningKeys, stake }
    spinRef.current = next
    setSpin(next)
    // On phones the wheel is above the table: bring it into view.
    const rect = wheelRef.current?.getBoundingClientRect()
    if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
      wheelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const onSettled = useCallback(
    (s: WheelSpin) => {
      const current = spinRef.current
      if (!current || current.id !== s.id) return
      spinRef.current = null
      guard.finish(current.roundId)
      push(current.number)
      setSpin(null)
      setResult({ number: current.number, winning: current.winning })
      setLastWin(current.payout)
      setBets({})
      setHistory([])
      showBanner({
        kind: resultKind(current.stake, current.payout),
        title: describeNumber(current.number),
        amount: current.payout - current.stake,
        subtitle: current.payout > 0 ? `Виплата ${formatChips(current.payout)}` : 'Ставки програли',
      })
    },
    [guard, push, showBanner],
  )

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,440px)_1fr] xl:items-start">
      <div ref={wheelRef} className="xl:col-start-1 xl:row-start-1">
        <Panel strong className="relative overflow-hidden bg-[radial-gradient(60%_60%_at_50%_45%,rgba(25,245,163,0.08),transparent_70%)] p-4 sm:p-6">
          <div className="mx-auto max-w-[340px] sm:max-w-[420px]">
            <RouletteWheel spin={spin} onSettled={onSettled} highlight={result?.number ?? null} />
          </div>
          <ResultBanner result={banner} />
        </Panel>
      </div>

      <Panel className="p-3 sm:p-4 xl:col-start-2 xl:row-start-1">
        <RouletteTable bets={bets} onBet={place} onRemove={remove} disabled={spinning} vertical={vertical} result={result} />
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Натисніть на поле, щоб поставити фішку. Правий клік по ставці прибирає її.
        </p>
      </Panel>

      <ChipTableControls
        className="xl:col-start-2 xl:row-start-2"
        chip={chip}
        onChip={(v) => (sfx.play('chip'), setChip(v))}
        total={stake}
        lastWin={lastWin}
        busy={spinning}
        canUndo={history.length > 0}
        canRebet={totalStake(lastBets) > 0}
        onUndo={undo}
        onClear={clear}
        onDouble={double}
        onRebet={rebet}
        actionLabel="Крутити"
        busyLabel="Кулька в грі…"
        actionIcon={Disc3}
        onAction={doSpin}
      />

      <div className="xl:col-start-1 xl:row-start-2">
        <HistoryStrip />
      </div>
    </div>
  )
}
