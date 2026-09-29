import { Gamepad2, Gift, House, UserRound, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { sfx } from '../../audio/sfx'
import { GAME_LIST } from '../../games/meta'
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
      className={cn('relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold', active ? 'text-gold-200' : 'text-slate-400')}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.span
          layoutId="mobile-tab"
          className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold-300 shadow-glow-gold"
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
        />
      )}
      <span className="relative">
        <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.9} />
        {dot && <span className="absolute -top-0.5 -right-1 size-2.5 rounded-full border-2 border-ink-900 bg-emerald-400" />}
      </span>
      {label}
    </button>
  )
}

export function MobileNav() {
  const route = useRoute()
  const { gamesOpen, setGamesOpen, setRewardsOpen } = useUi()
  const claimable = useHasClaimable()

  return (
    <nav
      className="glass-strong fixed inset-x-0 bottom-0 z-50 flex rounded-t-2xl border-b-0 px-2 safe-bottom lg:hidden"
      aria-label="Навигация"
    >
      <Tab icon={House} label="Лобби" active={route.name === 'lobby'} onClick={() => navigate(paths.lobby)} />
      <Tab icon={Gamepad2} label="Игры" active={route.name === 'game' || gamesOpen} onClick={() => setGamesOpen(true)} />
      <Tab icon={Gift} label="Бонусы" dot={claimable} onClick={() => setRewardsOpen(true)} />
      <Tab icon={UserRound} label="Профиль" active={route.name === 'profile'} onClick={() => navigate(paths.profile)} />
    </nav>
  )
}

/** Quick game switcher sheet (mobile "Игры" tab). */
export function GamesSheet() {
  const { gamesOpen, setGamesOpen } = useUi()
  const favorites = useCasino((s) => s.favorites)
  const sorted = [...GAME_LIST].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)))
  return (
    <Modal open={gamesOpen} onClose={() => setGamesOpen(false)} title="Все игры">
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              sfx.play('click')
              setGamesOpen(false)
              navigate(paths.game(g.id))
            }}
            className="overflow-hidden rounded-2xl border border-white/10 text-left transition active:scale-[0.97]"
          >
            <GameArt game={g} className="h-20" iconSize="size-6" />
            <div className="bg-ink-900/80 px-3 py-2">
              <p className="truncate text-sm font-bold text-white">{g.name}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
