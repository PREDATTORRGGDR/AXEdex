import { Disc3, Layers2, Repeat, Trash2, Undo2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { Button } from '../../components/ui/Button'
import { ChipSelector } from '../../components/ui/CasinoChip'
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

const POCKET_BG = { red: 'bg-roulette-red', black: 'bg-roulette-black', green: 'bg-roulette-green' }

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
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Последние номера</p>
        <p className="text-[11px] text-slate-500">за {numbers.length} спинов</p>
      </div>
      <div className="no-scrollbar flex h-10 gap-1.5 overflow-x-auto">
        <AnimatePresence initial={false}>
          {recent.length === 0 && <p className="text-sm text-slate-500">Пока ни одного спина</p>}
          {recent.map((n, i) => (
            <motion.span
              key={numbers.length - i}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: i === 0 ? 1.1 : 1, opacity: 1 - i * 0.04 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ring-1 ring-white/15',
                POCKET_BG[colorOf(n)],
                i === 0 && 'shadow-glow-gold ring-2 ring-gold-300',
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
            <div className="bg-slate-600" style={{ width: `${black * 100}%` }} />
            <div className="bg-roulette-green" style={{ width: `${zero * 100}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Красное {formatPercent(red)}</span>
            <span>Зеро {formatPercent(zero)}</span>
            <span>Чёрное {formatPercent(black)}</span>
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

  const [chip, setChip] = useState(25)
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
      toast({ kind: 'warning', title: 'Недостаточно фишек', message: 'Уменьшите номинал фишки или заберите бонус.' })
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
      toast({ kind: 'warning', title: 'Недостаточно фишек для повтора' })
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
        subtitle: current.payout > 0 ? `Выплата ${formatChips(current.payout)}` : 'Ставки проиграли',
      })
    },
    [guard, push, showBanner],
  )

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,440px)_1fr] xl:items-start">
      <div ref={wheelRef} className="xl:col-start-1 xl:row-start-1">
        <Panel strong className="relative overflow-hidden p-4 sm:p-6">
          <div className="mx-auto max-w-[340px] sm:max-w-[420px]">
            <RouletteWheel spin={spin} onSettled={onSettled} highlight={result?.number ?? null} />
          </div>
          <ResultBanner result={banner} />
        </Panel>
      </div>

      <Panel className="p-3 sm:p-4 xl:col-start-2 xl:row-start-1">
        <RouletteTable bets={bets} onBet={place} onRemove={remove} disabled={spinning} vertical={vertical} result={result} />
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Нажмите на поле, чтобы поставить фишку. Правый клик по ставке убирает её.
        </p>
      </Panel>

      <Panel strong className="sticky bottom-[76px] z-20 space-y-3 p-3 sm:p-4 lg:bottom-4 xl:col-start-2 xl:row-start-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <ChipSelector value={chip} onChange={(v) => (sfx.play('chip'), setChip(v))} balance={balance} />
          <div className="flex gap-5 text-right">
            <div>
              <p className="text-[11px] text-slate-400">Ставка</p>
              <p className="text-lg font-bold text-white tabular-nums">{formatChips(stake)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Последний выигрыш</p>
              <p className={cn('text-lg font-bold tabular-nums', lastWin > 0 ? 'text-emerald-300' : 'text-slate-400')}>
                {formatChips(lastWin)}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(4,auto)_1fr] gap-2">
          <Button variant="glass" size="md" icon={Undo2} aria-label="Отменить" disabled={spinning || !history.length} onClick={undo}>
            <span className="hidden sm:inline">Отменить</span>
          </Button>
          <Button variant="glass" size="md" icon={Trash2} aria-label="Очистить" disabled={spinning || !stake} onClick={clear}>
            <span className="hidden sm:inline">Очистить</span>
          </Button>
          <Button variant="glass" size="md" icon={Layers2} aria-label="Удвоить" disabled={spinning || !stake} onClick={double} sound={false}>
            <span className="hidden sm:inline">Удвоить</span>
          </Button>
          <Button variant="glass" size="md" icon={Repeat} aria-label="Повторить" disabled={spinning || !!stake || !totalStake(lastBets)} onClick={rebet} sound={false}>
            <span className="hidden sm:inline">Повторить</span>
          </Button>
          <Button variant="gold" size="lg" icon={Disc3} sound={false} disabled={spinning || stake <= 0 || stake > balance} onClick={doSpin}>
            {spinning ? 'Шарик в игре…' : 'Крутить'}
          </Button>
        </div>
      </Panel>

      <div className="xl:col-start-1 xl:row-start-2">
        <HistoryStrip />
      </div>
    </div>
  )
}
