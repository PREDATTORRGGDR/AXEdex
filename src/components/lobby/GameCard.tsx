import { Heart, Play } from 'lucide-react'
import { memo } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { sfx } from '../../audio/sfx'
import type { GameMeta } from '../../games/meta'
import { cn } from '../../lib/cn'
import { formatChips, formatDecimal } from '../../lib/format'
import { navigate, paths } from '../../router/router'
import { useCasino } from '../../store/casino'
import { GameArt } from '../game/GameArt'

const BADGE_STYLES: Record<NonNullable<GameMeta['badge']>, string> = {
  Хит: 'bg-rose-500/90 text-white',
  Новинка: 'bg-emerald-400/90 text-ink-950',
  Джекпот: 'bg-gold-300/95 text-ink-950',
}

/** Lobby tile with a pointer-driven 3D tilt and glare. */
export const GameCard = memo(function GameCard({ game, index = 0 }: { game: GameMeta; index?: number }) {
  const favorite = useCasino((s) => s.favorites.includes(game.id))
  const rounds = useCasino((s) => s.games[game.id]?.rounds ?? 0)
  const toggleFavorite = useCasino((s) => s.toggleFavorite)

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), { stiffness: 250, damping: 20 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), { stiffness: 250, damping: 20 })
  const glareX = useTransform(px, [0, 1], ['0%', '100%'])
  const glareY = useTransform(py, [0, 1], ['0%', '100%'])
  const glare = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.22), transparent 55%)`,
  )

  const open = () => {
    sfx.play('whoosh')
    navigate(paths.game(game.id))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 900, contentVisibility: 'auto', containIntrinsicSize: '320px 300px' }}
    >
      <motion.div
        role="link"
        tabIndex={0}
        aria-label={`Играть: ${game.name}`}
        onClick={open}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return
          const r = e.currentTarget.getBoundingClientRect()
          px.set((e.clientX - r.left) / r.width)
          py.set((e.clientY - r.top) / r.height)
        }}
        onPointerLeave={() => {
          px.set(0.5)
          py.set(0.5)
        }}
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.98 }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow] duration-300 hover:border-white/25"
      >
        <div
          className="pointer-events-none absolute -inset-px -z-10 rounded-3xl opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-60"
          style={{ background: `linear-gradient(135deg, ${game.colors[0]}, transparent 60%)` }}
        />
        <GameArt game={game} className="aspect-[16/9]" />
        <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: glare }} />

        {game.badge && (
          <span className={cn('absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider uppercase shadow-lg', BADGE_STYLES[game.badge])}>
            {game.badge}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            sfx.play(favorite ? 'click' : 'ping')
            toggleFavorite(game.id)
          }}
          className={cn(
            'absolute top-3 right-3 grid size-9 place-items-center rounded-full backdrop-blur-md transition',
            favorite ? 'bg-rose-500/25 text-rose-300' : 'bg-ink-950/50 text-white/70 hover:text-white',
          )}
          aria-label={favorite ? `Убрать «${game.name}» из избранного` : `Добавить «${game.name}» в избранное`}
          aria-pressed={favorite}
        >
          <Heart className={cn('size-4', favorite && 'fill-rose-400')} />
        </button>

        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="grid size-14 translate-y-2 place-items-center rounded-full bg-[linear-gradient(180deg,#fff0bd,#fcd96b_40%,#e2ab1c)] text-ink-950 shadow-glow-gold transition-transform duration-300 group-hover:translate-y-0">
            <Play className="ml-0.5 size-6 fill-ink-950" />
          </span>
        </div>

        <div className="relative space-y-1 p-4">
          <h3 className="truncate font-display text-base font-bold text-white">{game.name}</h3>
          <p className="truncate text-xs text-slate-400">{game.tagline}</p>
          <div className="flex items-center gap-3 pt-1.5 text-[11px] text-slate-500">
            <span>
              Отдача <b className="font-semibold text-slate-300">{formatDecimal(game.rtp, 1)}%</b>
            </span>
            <span className="size-1 rounded-full bg-slate-600" />
            <span>
              {rounds > 0 ? (
                <>
                  Сыграно <b className="font-semibold text-slate-300">{formatChips(rounds)}</b>
                </>
              ) : (
                'Ещё не играли'
              )}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
})
