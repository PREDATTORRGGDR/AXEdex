import { Play } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sfx } from '../../audio/sfx'
import { BetSpot } from '../../components/game/BetSpot'
import { ChipTableControls } from '../../components/game/ChipTableControls'
import { PlayingCard } from '../../components/game/PlayingCard'
import { ResultBanner } from '../../components/game/ResultBanner'
import { Panel } from '../../components/ui/Panel'
import { useChipBets } from '../../hooks/useChipBets'
import { useMountedRef } from '../../hooks/useMounted'
import { useResultBanner, resultKind } from '../../hooks/useResultBanner'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { wait } from '../../lib/async'
import type { Card } from '../../lib/cards'
import { cn } from '../../lib/cn'
import { useCasino } from '../../store/casino'
import { persistStorage, STORAGE_PREFIX } from '../../store/storage'
import { BACCARAT_LABELS, BACCARAT_ODDS, baccaratPayout, playBaccarat, score, type BaccaratBet, type BaccaratWinner } from './logic'

const useRoad = create<{ road: BaccaratWinner[]; push: (w: BaccaratWinner) => void }>()(
  persist((set) => ({ road: [], push: (w) => set((s) => ({ road: [...s.road, w].slice(-60) })) }), {
    name: `${STORAGE_PREFIX}:baccarat`,
    storage: persistStorage,
  }),
)

const ROAD_STYLE: Record<BaccaratWinner, string> = {
  player: 'bg-neon-cyan text-ink-950',
  banker: 'bg-neon-red text-white',
  tie: 'bg-neon-emerald text-[#03140d]',
}
const ROAD_LETTER: Record<BaccaratWinner, string> = { player: 'Г', banker: 'Б', tie: 'Н' }

function HandArea({ title, cards, total, tone, winner }: { title: string; cards: Card[]; total: number | null; tone: 'blue' | 'red'; winner: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col items-center gap-3 rounded-2xl p-3 transition-shadow', winner && (tone === 'blue' ? 'shadow-[0_0_0_1px_rgba(34,225,255,0.85),0_0_30px_rgba(34,225,255,0.3)]' : 'shadow-[0_0_0_1px_rgba(255,77,109,0.85),0_0_30px_rgba(255,77,109,0.3)]'))}>
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-black tracking-[0.2em] uppercase', tone === 'blue' ? 'text-neon-cyan' : 'text-[#ff8da1]')}>{title}</span>
        {total !== null && (
          <motion.span key={total} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className={cn('num grid size-8 place-items-center rounded-md text-sm font-bold', tone === 'blue' ? 'bg-neon-cyan text-ink-950' : 'bg-neon-red text-white')}>
            {total}
          </motion.span>
        )}
      </div>
      <div className="flex min-h-[80px] items-center min-[400px]:min-h-[92px] sm:min-h-[130px]">
        {cards.map((c, i) => (
          <div key={c.id} className={cn(i > 0 && '-ml-8 sm:-ml-10', i === 2 && 'ml-1 rotate-90 sm:ml-2')} style={{ zIndex: i }}>
            <PlayingCard card={c} size="lg" from={{ x: 0, y: -160 }} />
          </div>
        ))}
        {cards.length === 0 && <div className="h-[80px] w-[56px] rounded-lg border-2 border-dashed border-white/10 min-[400px]:h-[92px] min-[400px]:w-[64px] sm:h-[130px] sm:w-[92px] sm:rounded-xl" />}
      </div>
    </div>
  )
}

export default function BaccaratGame() {
  const guard = useRoundGuard()
  const mounted = useMountedRef()
  const [banner, showBanner] = useResultBanner(2800)
  const { road, push } = useRoad()
  const chips = useChipBets<BaccaratBet>()
  const [chip, setChip] = useState(10)
  const [busy, setBusy] = useState(false)
  const [player, setPlayer] = useState<Card[]>([])
  const [banker, setBanker] = useState<Card[]>([])
  const [winner, setWinner] = useState<BaccaratWinner | null>(null)
  const [lastWin, setLastWin] = useState(0)

  const deal = async () => {
    if (busy || chips.total <= 0) return
    const round = playBaccarat()
    const bets = chips.bets
    let payout = 0
    for (const [k, v] of Object.entries(bets) as [BaccaratBet, number][]) payout += baccaratPayout(k, v, round.winner)
    const stake = chips.total
    const roundId = useCasino.getState().startRound('baccarat', stake, {
      payout,
      tags: round.winner === 'tie' && bets.tie ? ['baccarat-tie'] : undefined,
      detail: `${BACCARAT_LABELS[round.winner === 'tie' ? 'tie' : round.winner]} · ${score(round.player)}:${score(round.banker)}`,
    })
    if (!roundId) return
    guard.track(roundId)
    chips.commit()
    setBusy(true)
    setWinner(null)
    setPlayer([])
    setBanker([])
    await wait(250)
    const p: Card[] = []
    const b: Card[] = []
    for (const side of round.order) {
      if (!mounted.current) return
      if (side === 'player') p.push(round.player[p.length])
      else b.push(round.banker[b.length])
      setPlayer([...p])
      setBanker([...b])
      sfx.play('deal')
      await wait(side === 'player' && p.length === 3 ? 700 : 480)
    }
    await wait(300)
    if (!mounted.current) return
    guard.finish(roundId)
    push(round.winner)
    setWinner(round.winner)
    setLastWin(payout)
    chips.reset()
    setBusy(false)
    const title = round.winner === 'tie' ? 'Нічия' : `Перемога: ${BACCARAT_LABELS[round.winner]}`
    showBanner({ kind: resultKind(stake, payout), title, amount: payout - stake, subtitle: `${score(round.player)} : ${score(round.banker)}` })
  }

  const spotState = (k: BaccaratBet) => (winner === null ? null : winner === k ? 'win' : winner === 'tie' && k !== 'tie' ? 'push' : 'lose')

  return (
    <div className="space-y-3 sm:space-y-4">
      <Panel strong className="felt relative overflow-hidden rounded-2xl border border-white/[0.07] p-3 sm:p-6">
        <p className="pointer-events-none text-center font-display text-[10px] font-bold tracking-[0.3em] text-gold-200/60 uppercase sm:text-xs">Пунто Банко · Банкір платить 0,95 до 1</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <HandArea title="Гравець" cards={player} total={player.length ? score(player) : null} tone="blue" winner={winner === 'player'} />
          <div className="hidden w-px bg-white/10 sm:block" />
          <HandArea title="Банкір" cards={banker} total={banker.length ? score(banker) : null} tone="red" winner={winner === 'banker'} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {(['player', 'tie', 'banker'] as const).map((k) => (
            <BetSpot
              key={k}
              label={BACCARAT_LABELS[k]}
              ariaLabel={BACCARAT_LABELS[k]}
              odds={BACCARAT_ODDS[k]}
              tone={k === 'player' ? 'blue' : k === 'banker' ? 'red' : 'green'}
              amount={chips.bets[k]}
              disabled={busy}
              state={spotState(k)}
              onClick={() => {
                if (winner) setWinner(null)
                chips.place(k, chip)
              }}
            />
          ))}
        </div>

        <div className="mt-4">
          <p className="eyebrow mb-1.5 text-[10px]">Доріжка результатів</p>
          <div className="well grid grid-flow-col grid-rows-6 justify-start gap-1 overflow-x-auto rounded-xl p-2">
            {road.map((w, i) => (
              <span key={i} className={cn('grid size-5 place-items-center rounded-full text-[9px] font-extrabold', ROAD_STYLE[w])}>
                {ROAD_LETTER[w]}
              </span>
            ))}
            {road.length === 0 && <span className="row-span-6 text-xs text-slate-500">Ще немає роздач</span>}
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
        onRebet={() => (setWinner(null), chips.rebet())}
        actionLabel="Роздати"
        busyLabel="Роздаємо…"
        actionIcon={Play}
        onAction={() => void deal()}
      />
    </div>
  )
}
