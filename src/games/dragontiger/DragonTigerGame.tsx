import { Swords } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { sfx } from '../../audio/sfx'
import { BetSpot } from '../../components/game/BetSpot'
import { ChipTableControls } from '../../components/game/ChipTableControls'
import { PlayingCard } from '../../components/game/PlayingCard'
import { ResultBanner } from '../../components/game/ResultBanner'
import { Icon } from '../../components/ui/Icon'
import { Panel } from '../../components/ui/Panel'
import { useChipBets } from '../../hooks/useChipBets'
import { useMountedRef } from '../../hooks/useMounted'
import { useResultBanner, resultKind } from '../../hooks/useResultBanner'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { wait } from '../../lib/async'
import type { Card } from '../../lib/cards'
import { cn } from '../../lib/cn'
import { useCasino } from '../../store/casino'
import { DT_LABELS, DT_ODDS, dtPayout, playDragonTiger, type DTBet, type DTWinner } from './logic'

const HISTORY_STYLE: Record<DTWinner, string> = {
  dragon: 'bg-orange-500 text-white',
  tiger: 'bg-neon-cyan text-ink-950',
  tie: 'bg-neon-emerald text-[#03140d]',
}
const HISTORY_LETTER: Record<DTWinner, string> = { dragon: 'Д', tiger: 'Т', tie: 'Н' }

function Side({ side, card, revealed, win }: { side: 'dragon' | 'tiger'; card: Card | null; revealed: boolean; win: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col items-center gap-2 rounded-2xl p-2 transition-shadow sm:gap-3 sm:p-4', win && (side === 'dragon' ? 'shadow-[0_0_0_1px_rgba(255,145,71,0.9),0_0_40px_rgba(255,145,71,0.35)]' : 'shadow-[0_0_0_1px_rgba(34,225,255,0.9),0_0_40px_rgba(34,225,255,0.35)]'))}>
      <motion.div animate={win ? { scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] } : { scale: 1 }} transition={{ duration: 0.8 }}>
        <Icon name={side === 'dragon' ? 'dragon-face' : 'tiger-face'} size={64} className="size-12 sm:size-16" />
      </motion.div>
      <p className={cn('font-display text-base font-black tracking-widest uppercase sm:text-lg', side === 'dragon' ? 'text-orange-300' : 'text-neon-cyan')}>{DT_LABELS[side]}</p>
      <div className="grid min-h-[80px] place-items-center min-[400px]:min-h-[92px] sm:min-h-[130px]">
        {card ? (
          <PlayingCard key={card.id} card={card} faceDown={!revealed} size="lg" from={{ x: side === 'dragon' ? 120 : -120, y: -140 }} highlight={win ? 'gold' : null} />
        ) : (
          <div className="h-[80px] w-[56px] rounded-lg border-2 border-dashed border-white/10 min-[400px]:h-[92px] min-[400px]:w-[64px] sm:h-[130px] sm:w-[92px] sm:rounded-xl" />
        )}
      </div>
    </div>
  )
}

export default function DragonTigerGame() {
  const guard = useRoundGuard()
  const mounted = useMountedRef()
  const [banner, showBanner] = useResultBanner(2600)
  const chips = useChipBets<DTBet>()
  const [chip, setChip] = useState(10)
  const [busy, setBusy] = useState(false)
  const [cards, setCards] = useState<{ dragon: Card | null; tiger: Card | null }>({ dragon: null, tiger: null })
  const [revealed, setRevealed] = useState({ dragon: false, tiger: false })
  const [winner, setWinner] = useState<DTWinner | null>(null)
  const [history, setHistory] = useState<DTWinner[]>([])
  const [lastWin, setLastWin] = useState(0)

  const deal = async () => {
    if (busy || chips.total <= 0) return
    const round = playDragonTiger()
    const bets = chips.bets
    let payout = 0
    for (const [k, v] of Object.entries(bets) as [DTBet, number][]) payout += dtPayout(k, v, round.winner)
    const stake = chips.total
    const roundId = useCasino.getState().startRound('dragontiger', stake, { payout, detail: `Перемога: ${DT_LABELS[round.winner]}` })
    if (!roundId) return
    guard.track(roundId)
    chips.commit()
    setBusy(true)
    setWinner(null)
    setRevealed({ dragon: false, tiger: false })
    setCards({ dragon: round.dragon, tiger: null })
    sfx.play('deal')
    await wait(350)
    setCards({ dragon: round.dragon, tiger: round.tiger })
    sfx.play('deal')
    await wait(650)
    if (!mounted.current) return
    setRevealed({ dragon: true, tiger: false })
    sfx.play('flip')
    await wait(750)
    if (!mounted.current) return
    setRevealed({ dragon: true, tiger: true })
    sfx.play('flip')
    await wait(500)
    if (!mounted.current) return
    guard.finish(roundId)
    setWinner(round.winner)
    setHistory((h) => [round.winner, ...h].slice(0, 24))
    setLastWin(payout)
    chips.reset()
    setBusy(false)
    showBanner({ kind: resultKind(stake, payout), title: round.winner === 'tie' ? 'Нічия' : `Перемагає ${DT_LABELS[round.winner]}`, amount: payout - stake })
  }

  const spotState = (k: DTBet) => (winner === null ? null : winner === k ? 'win' : winner === 'tie' ? 'push' : 'lose')

  return (
    <div className="space-y-3 sm:space-y-4">
      <Panel strong className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(80%_70%_at_20%_20%,rgba(255,145,71,0.14),transparent),radial-gradient(80%_70%_at_80%_20%,rgba(34,225,255,0.12),transparent),linear-gradient(180deg,#120d0c,#07090d)] p-3 sm:p-6">
        <div className="flex items-stretch gap-2 sm:gap-4">
          <Side side="dragon" card={cards.dragon} revealed={revealed.dragon} win={winner === 'dragon'} />
          <div className="grid place-items-center">
            <span className="grid size-10 place-items-center rounded-full bg-ink-950/80 text-gold-200 ring-1 ring-gold-300/40 sm:size-12" aria-label="проти">
              <Swords className="size-5" />
            </span>
          </div>
          <Side side="tiger" card={cards.tiger} revealed={revealed.tiger} win={winner === 'tiger'} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {(['dragon', 'tie', 'tiger'] as const).map((k) => (
            <BetSpot
              key={k}
              label={DT_LABELS[k]}
              ariaLabel={DT_LABELS[k]}
              odds={DT_ODDS[k]}
              tone={k === 'dragon' ? 'gold' : k === 'tiger' ? 'blue' : 'green'}
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

        <div className="mt-4 flex items-center gap-2 overflow-hidden">
          <span className="eyebrow shrink-0 text-[10px]">Історія</span>
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            <AnimatePresence initial={false}>
              {history.map((w, i) => (
                <motion.span key={history.length - i} layout initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-black', HISTORY_STYLE[w])}>
                  {HISTORY_LETTER[w]}
                </motion.span>
              ))}
            </AnimatePresence>
            {history.length === 0 && <span className="text-xs text-slate-500">Ще немає роздач</span>}
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
        actionIcon={Swords}
        onAction={() => void deal()}
      />
    </div>
  )
}
