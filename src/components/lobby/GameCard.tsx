import { Heart, Play } from 'lucide-react'
import { memo } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { sfx } from '../../audio/sfx'
import type { GameMeta } from '../../games/meta'
import { cn } from '../../lib/cn'
import { formatDecimal } from '../../lib/format'
import { navigate, paths } from '../../router/router'
import { useCasino } from '../../store/casino'
import { GameArt } from '../game/GameArt'

const BADGE_STYLES: Record<NonNullable<GameMeta['badge']>, string> = {
  Хіт: 'bg-neon-red text-white shadow-[0_0_14px_-2px_rgba(255,77,109,0.8)]',
  Новинка: 'bg-neon-emerald text-[#03140d] shadow-[0_0_14px_-2px_rgba(25,245,163,0.8)]',
  Джекпот: 'bg-[linear-gradient(180deg,#fff0c2,#e6c26a_50%,#b8862a)] text-[#1b1204] shadow-[0_0_14px_-2px_rgba(230,194,106,0.8)]',
}

/** Portrait lobby tile with a pointer-driven 3D tilt, glare and a neon edge on hover. */
export const GameCard = memo(function GameCard({ game, index = 0 }: { game: GameMeta; index?: number }) {
  const favorite = useCasino((s) => s.favorites.includes(game.id))
  const toggleFavorite = useCasino((s) => s.toggleFavorite)

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 250, damping: 20 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-7, 7]), { stiffness: 250, damping: 20 })
  const glare = useTransform([px, py], ([x, y]) => `radial-gradient(circle at ${(x as number) * 100}% ${(y as number) * 100}%, rgba(255,255,255,0.16), transparent 55%)`)

  const open = () => {
    sfx.play('whoosh')
    navigate(paths.game(game.id))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.35), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 900, contentVisibility: 'auto', containIntrinsicSize: '180px 260px' }}
      className="min-w-0"
    >
      <motion.div
        role="link"
        tabIndex={0}
        aria-label={`Грати: ${game.name}`}
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
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.97 }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d', ['--game' as string]: game.colors[0] }}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-950 shadow-[0_18px_36px_-18px_rgba(0,0,0,1)] transition-[border-color,box-shadow] duration-300 hover:border-[color:var(--game)] hover:shadow-[0_0_0_1px_var(--game),0_0_36px_-8px_var(--game),0_18px_36px_-18px_rgba(0,0,0,1)]"
      >
        <GameArt game={game} className="aspect-[3/4]" iconSize={72} />
        <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: glare }} />

        {game.badge && (
          <span className={cn('absolute top-2.5 left-2.5 rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.08em] uppercase', BADGE_STYLES[game.badge])}>
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
            'absolute top-2 right-2 grid size-8 place-items-center rounded-lg border transition',
            favorite ? 'border-neon-red/40 bg-neon-red/15 text-neon-red' : 'border-white/10 bg-ink-950/60 text-white/60 hover:text-white',
          )}
          aria-label={favorite ? `Прибрати «${game.name}» з обраного` : `Додати «${game.name}» до обраного`}
          aria-pressed={favorite}
        >
          <Heart className={cn('size-3.5', favorite && 'fill-neon-red')} />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-[42%] grid -translate-y-1/2 place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="grid size-12 place-items-center rounded-full bg-[linear-gradient(180deg,#6dffc9,#19f5a3_45%,#0bb877)] text-[#03140d] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_3px_0_#05603f,0_0_28px_-4px_rgba(25,245,163,0.9)]">
            <Play className="ml-0.5 size-5 fill-[#03140d]" />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
          <h3 className="truncate font-display text-[13.5px] leading-tight font-bold text-white sm:text-[15px]">{game.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-400 sm:text-[11px]">
            <span className="num text-neon-emerald/90">{formatDecimal(game.rtp, 1)}%</span>
            <span className="size-0.5 rounded-full bg-slate-500" />
            <span className="truncate">{game.volatility} волат.</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
})
