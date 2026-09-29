import { Gamepad2, Gift, House, UserRound, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { CATEGORY_LABELS, GAME_LIST, type GameCategory } from '../../games/meta'
import { cn } from '../../lib/cn'
import { navigate, paths, useRoute } from '../../router/router'
import { useCasino } from '../../store/casino'
import { useUi } from '../../store/ui'
import { Modal } from '../ui/Modal'
import { GameArt } from '../game/GameArt'
import { useHasClaimable } from '../../hooks/useHasClaimable'

function Tab({ icon: Icon, label, active, onClick, dot }: { icon: LucideIcon; label: string; active?: boolean; onClick: () => void; dot?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.play('click')
        onClick()
      }}
      className={cn(
        'relative flex min-w-0 flex-1 flex-col items-center gap-1 pt-2.5 pb-1.5 text-[10.5px] font-bold tracking-wide transition-colors',
        active ? 'text-neon-emerald' : 'text-slate-500 active:text-slate-300',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.span
          layoutId="mobile-tab"
          className="absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-neon-emerald shadow-[0_0_14px_rgba(25,245,163,0.95)]"
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
        />
      )}
      <span className={cn('relative grid size-8 place-items-center rounded-xl transition-colors', active && 'bg-neon-emerald/10')}>
        <Icon className={cn('size-[21px]', active && 'drop-shadow-[0_0_6px_rgba(25,245,163,0.7)]')} strokeWidth={active ? 2.3 : 1.9} />
        {dot && (
          <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon-gold opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full border-2 border-ink-900 bg-neon-gold" />
          </span>
        )}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </button>
  )
}

export function MobileNav() {
  const route = useRoute()
  const { gamesOpen, setGamesOpen, rewardsOpen, setRewardsOpen } = useUi()
  const claimable = useHasClaimable()
  const overlay = gamesOpen || rewardsOpen

  return (
    <nav
      className="backdrop-glass fixed inset-x-0 bottom-0 z-50 flex border-t border-white/[0.06] bg-ink-950/85 px-1 shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.9)] safe-bottom lg:hidden"
      aria-label="Навігація"
    >
      <Tab icon={House} label="Лобі" active={!overlay && route.name === 'lobby'} onClick={() => navigate(paths.lobby)} />
      <Tab icon={Gamepad2} label="Ігри" active={gamesOpen || (!rewardsOpen && route.name === 'game')} onClick={() => setGamesOpen(true)} />
      <Tab icon={Gift} label="Бонуси" active={rewardsOpen} dot={claimable} onClick={() => setRewardsOpen(true)} />
      <Tab icon={UserRound} label="Профіль" active={!overlay && route.name === 'profile'} onClick={() => navigate(paths.profile)} />
    </nav>
  )
}

const FILTERS: ('all' | GameCategory)[] = ['all', 'table', 'cards', 'slots', 'instant']

/** Quick game switcher sheet (mobile "Ігри" tab). */
export function GamesSheet() {
  const { gamesOpen, setGamesOpen } = useUi()
  const route = useRoute()
  const favorites = useCasino((s) => s.favorites)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const list = useMemo(
    () =>
      [...GAME_LIST]
        .filter((g) => filter === 'all' || g.category === filter)
        .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))),
    [favorites, filter],
  )
  return (
    <Modal open={gamesOpen} onClose={() => setGamesOpen(false)} title="Усі ігри">
      <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => (sfx.play('click'), setFilter(f))}
            className={cn(
              'h-8 shrink-0 rounded-lg border px-3 text-xs font-bold transition',
              filter === f ? 'border-neon-emerald/40 bg-neon-emerald/10 text-neon-emerald' : 'border-white/[0.07] bg-white/[0.02] text-slate-400',
            )}
          >
            {f === 'all' ? 'Усі' : CATEGORY_LABELS[f]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {list.map((g) => {
          const current = route.name === 'game' && route.id === g.id
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                sfx.play('click')
                setGamesOpen(false)
                navigate(paths.game(g.id))
              }}
              className={cn(
                'min-w-0 overflow-hidden rounded-xl border text-left transition active:scale-[0.97]',
                current ? 'border-neon-emerald/50 shadow-[0_0_18px_-6px_rgba(25,245,163,0.7)]' : 'border-white/[0.07]',
              )}
            >
              <GameArt game={g} className="aspect-square" iconSize={40} />
              <div className="bg-ink-950 px-2 py-1.5">
                <p className="truncate text-[11.5px] font-bold text-white">{g.name}</p>
              </div>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
