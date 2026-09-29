import { Heart } from 'lucide-react'
import { motion } from 'motion/react'
import { sfx } from '../../audio/sfx'
import { GAME_LIST } from '../../games/meta'
import { cn } from '../../lib/cn'
import { navigate, paths, useRoute } from '../../router/router'
import { useCasino } from '../../store/casino'
import { useUi } from '../../store/ui'
import { useHasClaimable } from '../../hooks/useHasClaimable'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/iconNames'
import { Logo } from './Logo'

function NavItem({
  active,
  onClick,
  icon,
  label,
  trailing,
}: {
  active?: boolean
  onClick: () => void
  icon: IconName
  label: string
  trailing?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.play('click')
        onClick()
      }}
      className={cn(
        'group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
        active ? 'text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl border border-gold-400/25 bg-[linear-gradient(90deg,rgba(245,197,66,0.16),rgba(245,197,66,0.02))]"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      {active && <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-gold-300 shadow-glow-gold" />}
      <Icon name={icon} size={22} className="relative transition-transform duration-300 group-hover:scale-115 group-hover:-rotate-6" />
      <span className="relative truncate">{label}</span>
      {trailing && <span className="relative ml-auto">{trailing}</span>}
    </button>
  )
}

export function Sidebar() {
  const route = useRoute()
  const favorites = useCasino((s) => s.favorites)
  const setRewardsOpen = useUi((s) => s.setRewardsOpen)
  const claimable = useHasClaimable()

  const sorted = [...GAME_LIST].sort(
    (a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)),
  )

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/5 bg-ink-950/85 lg:flex">
      <div className="flex h-20 items-center px-5">
        <Logo />
      </div>

      <nav className="flex flex-col gap-1 px-3" aria-label="Основное меню">
        <NavItem icon="house" label="Лобби" active={route.name === 'lobby'} onClick={() => navigate(paths.lobby)} />
        <NavItem icon="crown" label="Профиль" active={route.name === 'profile'} onClick={() => navigate(paths.profile)} />
        <NavItem
          icon="wrapped-gift"
          label="Бонусы"
          onClick={() => setRewardsOpen(true)}
          trailing={
            claimable && (
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
              </span>
            )
          }
        />
      </nav>

      <p className="mt-6 mb-2 px-6 text-[10px] font-bold tracking-[0.22em] text-slate-500 uppercase">Игры</p>
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4" aria-label="Игры">
        <div className="flex flex-col gap-0.5">
          {sorted.map((g) => (
            <NavItem
              key={g.id}
              icon={g.emoji}
              label={g.name}
              active={route.name === 'game' && route.id === g.id}
              onClick={() => navigate(paths.game(g.id))}
              trailing={favorites.includes(g.id) && <Heart className="size-3.5 fill-rose-400 text-rose-400" />}
            />
          ))}
        </div>
      </nav>

    </aside>
  )
}
