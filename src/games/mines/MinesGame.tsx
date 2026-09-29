import { Bomb, Dices, Gem, HandCoins, Play } from 'lucide-react'
import { motion, useAnimate } from 'motion/react'
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { haptic, sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
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
        state === 'hidden' ? `Клетка ${index + 1}` : state.startsWith('gem') ? `Клетка ${index + 1}: кристалл` : `Клетка ${index + 1}: мина`
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
            'absolute inset-0 rounded-xl border border-white/10 bg-[linear-gradient(160deg,#1e2a52,#0c1330)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_14px_-6px_rgba(0,0,0,0.8)] [backface-visibility:hidden]',
            !disabled && 'hover:border-gold-300/50 hover:shadow-[0_0_20px_-4px_rgba(252,217,107,0.5)]',
          )}
        >
          <div className="absolute inset-[18%] rounded-lg bg-white/[0.03]" />
        </div>
        <div
          className={cn(
            'absolute inset-0 grid place-items-center rounded-xl border [backface-visibility:hidden] [transform:rotateY(180deg)]',
            state === 'gem' && 'border-emerald-300/50 bg-[radial-gradient(circle,rgba(52,245,160,0.3),rgba(6,50,42,0.9))] shadow-glow-green',
            state === 'gem-ghost' && 'border-white/5 bg-emerald-900/20 opacity-50',
            state === 'mine-hit' && 'border-rose-300/60 bg-[radial-gradient(circle,rgba(255,77,109,0.6),rgba(80,10,20,0.95))] shadow-[0_0_30px_rgba(255,77,109,0.7)]',
            (state === 'mine' || state === 'mine-ghost') && 'border-rose-400/20 bg-rose-950/40',
            state === 'mine-ghost' && 'opacity-60',
          )}
        >
          {state.startsWith('gem') && (
            <Gem className={cn('size-[55%]', state === 'gem' ? 'text-emerald-200 drop-shadow-[0_0_10px_rgba(52,245,160,0.9)]' : 'text-emerald-300/60')} strokeWidth={1.6} />
          )}
          {state.startsWith('mine') && (
            <Bomb className={cn('size-[55%]', state === 'mine-hit' ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]' : 'text-rose-300/80')} strokeWidth={1.6} />
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
      showBanner({ kind: 'lose', title: 'Бум! Мина', amount: -m.activeBet }, { silent: true })
    }
  }

  const onStart = () => {
    if (m.bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостаточно фишек' })
      return
    }
    if (start()) sfx.play('whoosh')
  }

  const onCashOut = () => {
    const payout = cashOut()
    if (payout > 0) {
      sfx.play('cashout')
      const mult = payout / m.activeBet
      showBanner({ kind: mult >= 10 ? 'bigwin' : 'win', title: 'Выигрыш забран', amount: payout - m.activeBet, multiplier: mult }, { silent: mult < 10 })
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
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel strong className="relative overflow-hidden p-3 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(251,191,36,0.12),transparent)]" />
        <div className="relative mx-auto max-w-[520px]">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[0.04] px-2 py-2 ring-1 ring-white/10">
              <p className="text-[10px] text-slate-400">Множитель</p>
              <p className="font-display text-lg font-black text-gold-200 tabular-nums">{formatMultiplier(current)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-2 py-2 ring-1 ring-white/10">
              <p className="text-[10px] text-slate-400">Следующий</p>
              <p className="font-display text-lg font-black text-emerald-300 tabular-nums">{formatMultiplier(next)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-2 py-2 ring-1 ring-white/10">
              <p className="text-[10px] text-slate-400">Шанс кристалла</p>
              <p className="font-display text-lg font-black text-white tabular-nums">{formatPercent(chance)}</p>
            </div>
          </div>
          <div ref={boardScope} className="grid grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: TILES }, (_, i) => (
              <Tile key={i} index={i} state={tileState(i)} disabled={!playing} onClick={() => onResult(reveal(i))} />
            ))}
          </div>
          {!playing && !finished && (
            <p className="mt-4 text-center text-sm text-slate-400">Выберите ставку и количество мин, затем нажмите «Начать игру».</p>
          )}
        </div>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="flex flex-col gap-4 p-4 lg:self-start">
        <BetInput value={m.bet} onChange={setBet} min={1} disabled={playing} />
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Количество мин</span>
            <span className="flex items-center gap-1 font-bold text-rose-300">
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
            className="w-full accent-rose-400 disabled:opacity-50"
            aria-label="Количество мин"
          />
          <div className="flex gap-1.5">
            {MINE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={playing}
                onClick={() => (sfx.play('click'), setMines(p))}
                className={cn('h-8 flex-1 rounded-lg text-xs font-bold transition disabled:opacity-50', m.mines === p ? 'bg-rose-500/25 text-rose-200 ring-1 ring-rose-400/40' : 'bg-white/[0.05] text-slate-300 hover:bg-white/10')}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {playing ? (
          <>
            <Button variant="emerald" size="xl" icon={HandCoins} sound={false} disabled={safe === 0} onClick={onCashOut}>
              {safe === 0 ? 'Откройте клетку' : `Забрать ${formatChips(Math.floor(m.activeBet * current))}`}
            </Button>
            <Button variant="glass" icon={Dices} onClick={() => onResult(randomPick())}>
              Случайная клетка
            </Button>
          </>
        ) : (
          <Button variant="gold" size="xl" icon={Play} sound={false} disabled={m.bet > balance} onClick={onStart}>
            {finished ? 'Играть снова' : 'Начать игру'}
          </Button>
        )}

        <div className="rounded-xl bg-white/[0.03] p-3 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Кристаллов открыто</span>
            <span className="font-bold text-white tabular-nums">
              {safe} / {TILES - m.mines}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Прибыль при выводе</span>
            <span className="font-bold text-emerald-300 tabular-nums">+{formatChips(Math.max(0, Math.floor((playing ? m.activeBet : m.bet) * current) - (playing ? m.activeBet : m.bet)))}</span>
          </div>
        </div>
      </Panel>
    </div>
  )
}
