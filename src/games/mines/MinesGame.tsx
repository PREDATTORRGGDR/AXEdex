import { Bomb, Dices, HandCoins, Play } from 'lucide-react'
import { motion, useAnimate } from 'motion/react'
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { haptic, sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Glyph } from '../../components/ui/Glyph'
import { Panel } from '../../components/ui/Panel'
import { useResultBanner } from '../../hooks/useResultBanner'
import { cn } from '../../lib/cn'
import { formatChips, formatMultiplier, formatPercent } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { toast } from '../../store/toasts'
import { MINE_PRESETS, multiplierFor, nextSafeChance, TILES } from './logic'
import { useMines } from './store'

type TileState = 'hidden' | 'gem' | 'mine' | 'mine-hit' | 'gem-ghost' | 'mine-ghost'

function Tile({ state, index, disabled, onClick }: { state: TileState; index: number; disabled: boolean; onClick: () => void }) {
  const open = state !== 'hidden'
  return (
    <motion.button
      type="button"
      disabled={disabled || open}
      onClick={onClick}
      whileHover={!disabled && !open ? { y: -3, scale: 1.03 } : undefined}
      whileTap={!disabled && !open ? { scale: 0.94 } : undefined}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.012 }}
      aria-label={
        state === 'hidden' ? `Клітинка ${index + 1}` : state.startsWith('gem') ? `Клітинка ${index + 1}: кристал` : `Клітинка ${index + 1}: міна`
      }
      className="relative aspect-square [perspective:600px]"
    >
      <motion.div
        className="relative size-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: open ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className={cn(
            'absolute inset-0 rounded-xl border border-white/[0.1] bg-[linear-gradient(180deg,#2b3547,#1a212d)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_0_#0a0d13,0_10px_16px_-8px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow] [backface-visibility:hidden]',
            !disabled && 'hover:border-neon-emerald/50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_0_#0a0d13,0_0_22px_-4px_rgba(25,245,163,0.6)]',
          )}
        >
          <div className="absolute inset-[22%] rounded-lg bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)]" />
        </div>
        <div
          className={cn(
            'absolute inset-0 grid place-items-center rounded-xl border [backface-visibility:hidden] [transform:rotateY(180deg)]',
            state === 'gem' && 'border-neon-emerald/50 bg-[radial-gradient(circle,rgba(25,245,163,0.28),rgba(4,30,22,0.95))] shadow-[0_0_24px_-4px_rgba(25,245,163,0.7)]',
            state === 'gem-ghost' && 'border-white/5 bg-[#0a1a14] opacity-45',
            state === 'mine-hit' && 'border-rose-300/60 bg-[radial-gradient(circle,rgba(255,77,109,0.6),rgba(80,10,20,0.95))] shadow-[0_0_30px_rgba(255,77,109,0.7)]',
            (state === 'mine' || state === 'mine-ghost') && 'border-neon-red/20 bg-[#1a0a0e]',
            state === 'mine-ghost' && 'opacity-60',
          )}
        >
          {state.startsWith('gem') && (
            <Glyph name="cut-diamond" tone="emerald" size={48} glow={state === 'gem'} className={cn('size-[58%]', state !== 'gem' && 'opacity-60')} />
          )}
          {state.startsWith('mine') && (
            <Glyph name="unlit-bomb" tone={state === 'mine-hit' ? 'orange' : 'rose'} size={48} glow={state === 'mine-hit'} className={cn('size-[58%]', state !== 'mine-hit' && 'opacity-70')} />
          )}
        </div>
      </motion.div>
    </motion.button>
  )
}

export default function MinesGame() {
  const balance = useCasino((s) => s.balance)
  const m = useMines(
    useShallow((s) => ({
      phase: s.phase,
      bet: s.bet,
      mines: s.mines,
      minePositions: s.minePositions,
      revealed: s.revealed,
      activeBet: s.activeBet,
      hitIndex: s.hitIndex,
      payout: s.payout,
    })),
  )
  const { setBet, setMines, start, reveal, randomPick, cashOut, reconcile } = useMines.getState()
  const [boardScope, animateBoard] = useAnimate<HTMLDivElement>()
  const [banner, showBanner] = useResultBanner(2600)

  useEffect(() => {
    reconcile()
  }, [reconcile])

  const playing = m.phase === 'playing'
  const finished = m.phase === 'busted' || m.phase === 'cashed'
  const safe = m.revealed.length
  const current = multiplierFor(m.mines, safe)
  const next = multiplierFor(m.mines, safe + 1)
  const chance = nextSafeChance(m.mines, safe)

  const onResult = (r: 'safe' | 'mine' | null) => {
    if (r === 'safe') {
      const count = useMines.getState().revealed.length
      sfx.play('gem', { pitch: 0.9 + count * 0.05 })
      haptic(10)
      if (useMines.getState().phase === 'cashed') {
        const p = useMines.getState().payout
        showBanner({ kind: 'bigwin', title: 'Поле очищено!', amount: p - m.activeBet, multiplier: p / m.activeBet })
      }
    } else if (r === 'mine') {
      sfx.play('explosion')
      haptic([60, 40, 80])
      if (boardScope.current) void animateBoard(boardScope.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45 })
      showBanner({ kind: 'lose', title: 'Бум! Міна', amount: -m.activeBet }, { silent: true })
    }
  }

  const onStart = () => {
    if (m.bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостатньо фішок' })
      return
    }
    if (start()) sfx.play('whoosh')
  }

  const onCashOut = () => {
    const payout = cashOut()
    if (payout > 0) {
      sfx.play('cashout')
      const mult = payout / m.activeBet
      showBanner({ kind: mult >= 10 ? 'bigwin' : 'win', title: 'Виграш забрано', amount: payout - m.activeBet, multiplier: mult }, { silent: mult < 10 })
    }
  }

  const tileState = (i: number): TileState => {
    const isMine = m.minePositions.includes(i)
    if (m.revealed.includes(i)) return 'gem'
    if (m.hitIndex === i) return 'mine-hit'
    if (finished) return isMine ? 'mine-ghost' : 'gem-ghost'
    return 'hidden'
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
      <Panel strong className="relative overflow-hidden bg-[linear-gradient(180deg,#0b0f16,#07090d)] p-3 sm:p-6 lg:col-start-2 lg:row-start-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(25,245,163,0.08),transparent)]" />
        <div className="relative mx-auto max-w-[520px]">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="well min-w-0 rounded-xl px-2 py-2">
              <p className="eyebrow text-[10px]">Множник</p>
              <p className="num text-lg font-bold text-gold-200">{formatMultiplier(current)}</p>
            </div>
            <div className="well min-w-0 rounded-xl px-2 py-2">
              <p className="eyebrow text-[10px]">Наступний</p>
              <p className="num text-lg font-bold text-neon-emerald">{formatMultiplier(next)}</p>
            </div>
            <div className="well min-w-0 rounded-xl px-2 py-2">
              <p className="eyebrow truncate text-[10px]">Шанс</p>
              <p className="num text-lg font-bold text-white">{formatPercent(chance)}</p>
            </div>
          </div>
          <div ref={boardScope} className="grid grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: TILES }, (_, i) => (
              <Tile key={i} index={i} state={tileState(i)} disabled={!playing} onClick={() => onResult(reveal(i))} />
            ))}
          </div>
          {!playing && !finished && (
            <p className="mt-4 text-center text-sm text-slate-400">Оберіть ставку та кількість мін, потім натисніть «Почати гру».</p>
          )}
        </div>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="flex flex-col gap-4 p-4 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
        <BetInput value={m.bet} onChange={setBet} min={1} disabled={playing} />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Кількість мін</span>
            <span className="num flex items-center gap-1 text-sm font-bold text-neon-red">
              <Bomb className="size-3.5" /> {m.mines}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={24}
            value={m.mines}
            disabled={playing}
            onChange={(e) => setMines(Number(e.target.value))}
            className="w-full accent-neon-red disabled:opacity-50"
            aria-label="Кількість мін"
          />
          <div className="flex gap-1.5">
            {MINE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={playing}
                onClick={() => (sfx.play('click'), setMines(p))}
                data-on={m.mines === p}
                className="preset num h-8 flex-1 rounded-lg text-xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {playing ? (
          <>
            <Button variant="emerald" size="xl" icon={HandCoins} sound={false} disabled={safe === 0} onClick={onCashOut}>
              {safe === 0 ? 'Відкрийте клітинку' : `Забрати ${formatChips(Math.floor(m.activeBet * current))}`}
            </Button>
            <Button variant="glass" icon={Dices} onClick={() => onResult(randomPick())}>
              Випадкова клітинка
            </Button>
          </>
        ) : (
          <Button variant="emerald" size="xl" icon={Play} sound={false} disabled={m.bet > balance} onClick={onStart}>
            {finished ? 'Грати знову' : 'Почати гру'}
          </Button>
        )}

        <div className="well rounded-xl p-3 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Кристалів відкрито</span>
            <span className="num font-bold text-white">
              {safe} / {TILES - m.mines}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Прибуток при виведенні</span>
            <span className="num font-bold text-neon-emerald">+{formatChips(Math.max(0, Math.floor((playing ? m.activeBet : m.bet) * current) - (playing ? m.activeBet : m.bet)))}</span>
          </div>
        </div>
      </Panel>
    </div>
  )
}
