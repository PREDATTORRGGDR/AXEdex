import { ArrowLeft, BookOpen, Heart, Percent, ShieldCheck, Waves } from 'lucide-react'
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
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { GameErrorBoundary } from './GameErrorBoundary'

function GameLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-11 animate-spin rounded-full border-[3px] border-neon-emerald/15 border-t-neon-emerald shadow-[0_0_24px_-6px_rgba(25,245,163,0.7)]" />
        <p className="text-sm text-slate-500">Готуємо стіл…</p>
      </div>
    </div>
  )
}

const chromeBtn =
  'grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-[linear-gradient(180deg,#1c2330,#141a24)] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_0_#07090d] transition hover:border-white/15 hover:text-white'

/** Page chrome shared by every game: header, rules, favorite toggle, per-game stats. */
export function GameShell({ id }: { id: GameId }) {
  const game = GAMES[id]
  const Game = GAME_COMPONENTS[id]
  const stats = useCasino((s) => s.games[id])
  const favorite = useCasino((s) => s.favorites.includes(id))
  const toggleFavorite = useCasino((s) => s.toggleFavorite)
  const [rulesOpen, setRulesOpen] = useState(false)

  return (
    <div className="mx-auto w-full max-w-[1320px]">
      <div className="mb-3 flex items-center gap-2.5 sm:mb-5 sm:gap-3">
        <button
          type="button"
          onClick={() => {
            sfx.play('click')
            navigate(paths.lobby)
          }}
          className={chromeBtn}
          aria-label="Назад до лобі"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div
          className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl ring-1 ring-white/10 sm:size-12"
          style={{ background: `radial-gradient(circle at 50% 40%, ${game.colors[0]}40, transparent 70%), linear-gradient(160deg, ${game.colors[1]}, #07090d)` }}
        >
          <Icon name={game.emoji} size={30} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[17px] leading-tight font-bold text-white sm:text-2xl">{game.name}</h1>
          <p className="flex min-w-0 items-center gap-2 text-[11.5px] text-slate-500 sm:text-sm">
            <span className="num shrink-0 font-semibold text-neon-emerald/90">RTP {formatDecimal(game.rtp, 1)}%</span>
            <span className="hidden size-1 shrink-0 rounded-full bg-slate-600 min-[420px]:block" />
            <span className="hidden truncate min-[420px]:block">{game.tagline}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            sfx.play(favorite ? 'click' : 'ping')
            toggleFavorite(id)
          }}
          className={cn(chromeBtn, favorite && 'border-neon-red/40 text-neon-red')}
          aria-label={favorite ? 'Прибрати з обраного' : 'Додати до обраного'}
          aria-pressed={favorite}
        >
          <motion.span key={String(favorite)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }}>
            <Heart className={cn('size-5', favorite && 'fill-neon-red drop-shadow-[0_0_6px_rgba(255,77,109,0.8)]')} />
          </motion.span>
        </button>
        <button
          type="button"
          onClick={() => {
            sfx.play('click')
            setRulesOpen(true)
          }}
          className={cn(chromeBtn, 'sm:flex sm:w-auto sm:gap-2 sm:px-3.5 sm:text-sm sm:font-bold')}
          aria-label="Правила"
        >
          <BookOpen className="size-[18px]" />
          <span className="hidden sm:inline">Правила</span>
        </button>
      </div>

      <GameErrorBoundary gameName={game.name}>
        <Suspense fallback={<GameLoading />}>
          <Game />
        </Suspense>
      </GameErrorBoundary>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
        {[
          { label: 'Зіграно раундів', value: formatChips(stats?.rounds ?? 0) },
          { label: 'Частка перемог', value: hasDecided(stats) ? formatPercent(winRate(stats!)) : '—' },
          { label: 'Кращий виграш', value: stats?.biggestWin ? `+${formatChips(stats.biggestWin)}` : '—' },
          { label: 'Кращий множник', value: stats?.bestMultiplier ? formatMultiplier(stats.bestMultiplier) : '—' },
        ].map((s) => (
          <div key={s.label} className="glass min-w-0 rounded-xl px-3 py-2.5">
            <p className="truncate text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">{s.label}</p>
            <p className="num mt-0.5 truncate text-base font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title={`Правила: ${game.name}`}>
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-neon-emerald/10 px-2.5 py-1 text-xs font-semibold text-neon-emerald ring-1 ring-neon-emerald/20">
            <Percent className="size-3.5" /> Теоретична віддача {formatDecimal(game.rtp, 1)}%
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-neon-violet/10 px-2.5 py-1 text-xs font-semibold text-violet-200 ring-1 ring-neon-violet/20">
            <Waves className="size-3.5" /> Волатильність: {game.volatility}
          </span>
        </div>
        <ol className="space-y-3">
          {game.rules.map((rule, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-200">
              <span className="num grid size-6 shrink-0 place-items-center rounded-md bg-white/[0.04] text-xs font-bold text-neon-emerald ring-1 ring-white/[0.08]">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ol>
        <div className="well mt-5 flex items-start gap-2.5 rounded-xl p-3 text-xs leading-relaxed text-slate-400">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-neon-emerald" />
          Усі результати визначає криптографічно стійкий генератор випадкових чисел браузера. Гра ведеться лише на віртуальні
          фішки, які не мають грошової цінності й не купуються.
        </div>
      </Modal>
    </div>
  )
}
