import { Gift, Volume2, VolumeX } from 'lucide-react'
import { motion } from 'motion/react'
import { sfx } from '../../audio/sfx'
import { cn } from '../../lib/cn'
import { useRoute } from '../../router/router'
import { GAMES } from '../../games/meta'
import { useCasino } from '../../store/casino'
import { levelFromXp } from '../../store/progression'
import { useUi } from '../../store/ui'
import { BalancePill } from '../wallet/BalancePill'
import { LevelBadge } from '../wallet/LevelBadge'
import { useHasClaimable } from '../../hooks/useHasClaimable'
import { Logo } from './Logo'

function pageTitle(route: ReturnType<typeof useRoute>): string {
  switch (route.name) {
    case 'lobby':
      return 'Лобі'
    case 'profile':
      return 'Профіль'
    case 'game':
      return GAMES[route.id].name
    default:
      return 'Сторінку не знайдено'
  }
}

export function TopBar() {
  const route = useRoute()
  const sound = useCasino((s) => s.settings.sound)
  const updateSettings = useCasino((s) => s.updateSettings)
  const xp = useCasino((s) => s.xp)
  const setRewardsOpen = useUi((s) => s.setRewardsOpen)
  const claimable = useHasClaimable()
  const level = levelFromXp(xp)

  return (
    <header
      className="backdrop-glass sticky top-0 z-40 border-b border-white/[0.05] bg-ink-900/80"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:h-[72px] lg:px-8">
        <Logo className="lg:hidden" collapsed />
        <div className="hidden min-w-0 lg:block">
          <p className="text-[10px] font-bold tracking-[0.24em] text-slate-600 uppercase">AXEdex · Казино</p>
          <h1 className="truncate font-display text-lg font-bold text-white">{pageTitle(route)}</h1>
        </div>

        {/* Wallet cluster: balance well joined to a tactile bonus button. */}
        <div className="mx-auto flex min-w-0 items-stretch lg:mx-0 lg:ml-auto">
          <BalancePill className="rounded-r-none border-r-0" />
          <motion.button
            type="button"
            whileTap={{ y: 2 }}
            onClick={() => {
              sfx.play('click')
              setRewardsOpen(true)
            }}
            className={cn(
              'relative flex h-10 shrink-0 items-center gap-1.5 rounded-r-xl px-3 text-[13px] font-bold transition-[box-shadow,filter] sm:h-11 sm:px-4',
              'bg-[linear-gradient(180deg,#6dffc9_0%,#19f5a3_40%,#0bcf86_75%,#079e67_100%)] text-[#03140d]',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_0_rgba(0,70,45,0.45),0_0_20px_-6px_rgba(25,245,163,0.7)] hover:brightness-110',
            )}
            aria-label="Бонуси"
            title="Бонуси"
          >
            <Gift className={cn('size-[18px]', claimable && 'animate-wiggle')} strokeWidth={2.4} />
            <span className="hidden sm:inline">Бонуси</span>
            {claimable && (
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon-gold opacity-75" />
                <span className="relative inline-flex size-3 rounded-full border-2 border-ink-900 bg-neon-gold" />
              </span>
            )}
          </motion.button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:ml-2">
          <button
            type="button"
            onClick={() => {
              updateSettings({ sound: !sound })
              if (!sound) window.setTimeout(() => sfx.play('click'), 0)
            }}
            className="hidden size-10 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-slate-400 transition hover:border-white/15 hover:text-white sm:grid"
            aria-label={sound ? 'Вимкнути звук' : 'Увімкнути звук'}
            title={sound ? 'Вимкнути звук' : 'Увімкнути звук'}
          >
            {sound ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
          </button>
          <LevelBadge size={38} className="sm:hidden" />
          <div className="hidden items-center gap-2.5 sm:flex">
            <LevelBadge size={42} />
            <div className="hidden flex-col leading-tight xl:flex">
              <span className="text-xs font-bold text-white">{level.title}</span>
              <span className="text-[10.5px] text-slate-500">Рівень {level.level}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
