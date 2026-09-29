import { ArrowLeft, BookOpen, Heart, Percent, Trophy, Waves } from 'lucide-react'
import { motion } from 'motion/react'
import { Suspense, useState } from 'react'
import { sfx } from '../../audio/sfx'
import type { GameId } from '../../games/ids'
import { GAMES } from '../../games/meta'
import { GAME_COMPONENTS } from '../../games/registry'
import { cn } from '../../lib/cn'
import { formatChips, formatDecimal, formatMultiplier, formatPercent } from '../../lib/format'
import { navigate, paths } from '../../router/router'
import { hasDecided, useCasino, winRate } from '../../store/casino'
import { Modal } from '../ui/Modal'
import { GameErrorBoundary } from './GameErrorBoundary'

function GameLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 animate-spin rounded-full border-4 border-gold-400/20 border-t-gold-300" />
        <p className="text-sm text-slate-400">Готовим стол…</p>
      </div>
    </div>
  )
}

/** Page chrome shared by every game: header, rules, favorite toggle, per-game stats. */
export function GameShell({ id }: { id: GameId }) {
  const game = GAMES[id]
  const Game = GAME_COMPONENTS[id]
  const stats = useCasino((s) => s.games[id])
  const favorite = useCasino((s) => s.favorites.includes(id))
  const toggleFavorite = useCasino((s) => s.toggleFavorite)
  const [rulesOpen, setRulesOpen] = useState(false)
  const Icon = game.icon

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center gap-3 sm:mb-6">
        <button
          type="button"
          onClick={() => {
            sfx.play('click')
            navigate(paths.lobby)
          }}
          className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Назад в лобби"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div
          className="grid size-11 place-items-center rounded-2xl ring-1 ring-white/15"
          style={{ background: `linear-gradient(135deg, ${game.colors[0]}, ${game.colors[1]})` }}
        >
          <Icon className="size-6 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold text-white sm:text-2xl">{game.name}</h1>
          <p className="truncate text-xs text-slate-400 sm:text-sm">{game.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sfx.play(favorite ? 'click' : 'ping')
              toggleFavorite(id)
            }}
            className={cn(
              'grid size-10 place-items-center rounded-xl border transition',
              favorite ? 'border-rose-400/40 bg-rose-500/10 text-rose-300' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white',
            )}
            aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            aria-pressed={favorite}
          >
            <motion.span key={String(favorite)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }}>
              <Heart className={cn('size-5', favorite && 'fill-rose-400')} />
            </motion.span>
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.play('click')
              setRulesOpen(true)
            }}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            <BookOpen className="size-4" />
            <span className="hidden sm:inline">Правила</span>
          </button>
        </div>
      </div>

      <GameErrorBoundary gameName={game.name}>
        <Suspense fallback={<GameLoading />}>
          <Game />
        </Suspense>
      </GameErrorBoundary>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          { label: 'Сыграно раундов', value: formatChips(stats?.rounds ?? 0) },
          { label: 'Доля побед', value: hasDecided(stats) ? formatPercent(winRate(stats!)) : '—' },
          { label: 'Лучший выигрыш', value: stats?.biggestWin ? `+${formatChips(stats.biggestWin)}` : '—' },
          { label: 'Лучший множитель', value: stats?.bestMultiplier ? formatMultiplier(stats.bestMultiplier) : '—' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{s.label}</p>
            <p className="mt-0.5 text-base font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title={`Правила: ${game.name}`}>
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <Percent className="size-3.5" /> Теоретическая отдача {formatDecimal(game.rtp, 1)}%
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-400/10 px-2.5 py-1 text-xs font-semibold text-violet-300">
            <Waves className="size-3.5" /> Волатильность: {game.volatility}
          </span>
        </div>
        <ol className="space-y-3">
          {game.rules.map((rule, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-200">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold-400/15 text-xs font-bold text-gold-300">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ol>
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-400">
          <Trophy className="mt-0.5 size-4 shrink-0 text-gold-300" />
          Все исходы определяются криптографически стойким генератором случайных чисел браузера. Игра ведётся только на
          виртуальные фишки, которые не имеют денежной ценности.
        </div>
      </Modal>
    </div>
  )
}
