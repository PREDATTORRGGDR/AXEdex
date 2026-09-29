import { Gift, Volume2, VolumeX } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
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
      return 'Лобби'
    case 'profile':
      return 'Профиль'
    case 'game':
      return GAMES[route.id].name
    default:
      return 'Страница не найдена'
  }
}

export function TopBar() {
  const route = useRoute()
  const sound = useCasino((s) => s.settings.sound)
  const updateSettings = useCasino((s) => s.updateSettings)
  const xp = useCasino((s) => s.xp)
  const setRewardsOpen = useUi((s) => s.setRewardsOpen)
  const claimable = useHasClaimable()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const level = levelFromXp(xp)

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled ? 'border-b border-white/5 bg-ink-950/70 backdrop-blur-xl' : 'border-b border-transparent',
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Logo className="lg:hidden" collapsed />
        <div className={cn('hidden min-w-0', route.name !== 'game' && 'lg:block')}>
          <p className="text-[10px] font-bold tracking-[0.22em] text-slate-500 uppercase">AXEdex</p>
          <h1 className="truncate font-display text-xl font-bold text-white">{pageTitle(route)}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              updateSettings({ sound: !sound })
              if (!sound) window.setTimeout(() => sfx.play('click'), 0)
            }}
            className="hidden size-10 place-items-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white sm:grid"
            aria-label={sound ? 'Выключить звук' : 'Включить звук'}
            title={sound ? 'Выключить звук' : 'Включить звук'}
          >
            {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              sfx.play('click')
              setRewardsOpen(true)
            }}
            className={cn(
              'relative grid size-11 place-items-center rounded-2xl border transition',
              claimable
                ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300 shadow-glow-green'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:text-white',
            )}
            aria-label="Бесплатные фишки"
            title="Бесплатные фишки"
          >
            <Gift className={cn('size-5', claimable && 'animate-[pulse-glow_1.6s_ease-in-out_infinite]')} />
            {claimable && (
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full border-2 border-ink-950 bg-emerald-400" />
              </span>
            )}
          </motion.button>

          <BalancePill />

          <div className="hidden items-center gap-2.5 sm:flex">
            <LevelBadge />
            <div className="hidden flex-col leading-tight xl:flex">
              <span className="text-xs font-bold text-white">{level.title}</span>
              <span className="text-[10px] text-slate-400">Уровень {level.level}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
