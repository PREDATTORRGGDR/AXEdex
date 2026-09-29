import { Heart } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { sfx } from '../../audio/sfx'
import { CATEGORY_LABELS, GAME_LIST, type GameCategory } from '../../games/meta'
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
  trailing?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.play('click')
        onClick()
      }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13.5px] font-semibold transition-colors',
        active ? 'text-white' : 'text-slate-400 hover:bg-white/[0.035] hover:text-slate-100',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg border border-neon-emerald/15 bg-[linear-gradient(90deg,rgba(25,245,163,0.14),rgba(25,245,163,0.015)_70%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        >
          <span className="absolute top-2 bottom-2 -left-px w-[3px] rounded-full bg-neon-emerald shadow-[0_0_12px_rgba(25,245,163,0.9)]" />
        </motion.span>
      )}
      <Icon name={icon} size={20} glow={!!active} className="relative shrink-0 transition-transform duration-300 group-hover:scale-110" />
      <span className="relative min-w-0 truncate">{label}</span>
      {trailing && <span className="relative ml-auto flex shrink-0 items-center">{trailing}</span>}
    </button>
  )
}

const ORDER: GameCategory[] = ['table', 'cards', 'slots', 'instant']

export function Sidebar() {
  const route = useRoute()
  const favorites = useCasino((s) => s.favorites)
  const setRewardsOpen = useUi((s) => s.setRewardsOpen)
  const claimable = useHasClaimable()
  const favGames = GAME_LIST.filter((g) => favorites.includes(g.id))

  const gameItem = (g: (typeof GAME_LIST)[number]) => (
    <NavItem
      key={g.id}
      icon={g.emoji}
      label={g.name}
      active={route.name === 'game' && route.id === g.id}
      onClick={() => navigate(paths.game(g.id))}
      trailing={favorites.includes(g.id) && <Heart className="size-3 fill-neon-red text-neon-red" />}
    />
  )

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/[0.05] bg-[linear-gradient(180deg,#0a0d13,#07090d)] lg:flex">
      <div className="flex h-[72px] shrink-0 items-center border-b border-white/[0.04] px-5">
        <Logo />
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4" aria-label="Головне меню">
        <div className="flex flex-col gap-0.5">
          <NavItem icon="house" label="Лобі" active={route.name === 'lobby'} onClick={() => navigate(paths.lobby)} />
          <NavItem icon="crown" label="Профіль" active={route.name === 'profile'} onClick={() => navigate(paths.profile)} />
          <NavItem
            icon="wrapped-gift"
            label="Бонуси"
            onClick={() => setRewardsOpen(true)}
            trailing={
              claimable && (
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon-emerald opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-neon-emerald" />
                </span>
              )
            }
          />
        </div>

        {favGames.length > 0 && (
          <>
            <p className="mt-6 mb-1.5 px-3 text-[10px] font-bold tracking-[0.22em] text-slate-600 uppercase">Обране</p>
            <div className="flex flex-col gap-0.5">{favGames.map(gameItem)}</div>
          </>
        )}

        {ORDER.map((cat) => (
          <div key={cat}>
            <p className="mt-6 mb-1.5 px-3 text-[10px] font-bold tracking-[0.22em] text-slate-600 uppercase">{CATEGORY_LABELS[cat]}</p>
            <div className="flex flex-col gap-0.5">{GAME_LIST.filter((g) => g.category === cat && !favorites.includes(g.id)).map(gameItem)}</div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/[0.04] px-5 py-3.5">
        <p className="text-[11px] text-slate-600">
          Зроблено by <span className="font-display font-bold text-gold-gradient">kyrapyto</span>
        </p>
      </div>
    </aside>
  )
}
