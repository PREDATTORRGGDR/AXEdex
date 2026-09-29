import { Lock } from 'lucide-react'
import { motion } from 'motion/react'
import { GAME_IDS } from '../../games/ids'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import { formatChips } from '../../lib/format'
import { ACHIEVEMENTS, type AchievementSnapshot, type AchievementTier } from '../../store/achievements'
import { useCasino } from '../../store/casino'
import { levelFromXp } from '../../store/progression'

const TIER: Record<AchievementTier, { label: string; ring: string; glow: string }> = {
  bronze: { label: 'Бронза', ring: 'from-orange-300 to-amber-700', glow: 'shadow-[0_0_24px_-6px_rgba(251,146,60,0.6)]' },
  silver: { label: 'Срібло', ring: 'from-slate-100 to-slate-500', glow: 'shadow-[0_0_24px_-6px_rgba(226,232,240,0.5)]' },
  gold: { label: 'Золото', ring: 'from-gold-200 to-gold-600', glow: 'shadow-[0_0_24px_-6px_rgba(230,194,106,0.7)]' },
  platinum: { label: 'Платина', ring: 'from-neon-cyan via-violet-300 to-neon-emerald', glow: 'shadow-[0_0_28px_-6px_rgba(165,243,252,0.7)]' },
}

export function AchievementGrid() {
  const state = useCasino()
  const snapshot: AchievementSnapshot = {
    balance: state.balance,
    peakBalance: state.lifetime.peakBalance,
    rounds: state.lifetime.rounds,
    currentStreak: state.lifetime.currentStreak,
    bestStreak: state.lifetime.bestStreak,
    refills: state.lifetime.refills,
    dailyStreak: state.daily.streak,
    level: levelFromXp(state.xp).level,
    gamesPlayed: GAME_IDS.filter((g) => (state.games[g]?.rounds ?? 0) > 0),
  }

  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(!!state.achievements[b.id]) - Number(!!state.achievements[a.id]))

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((a, i) => {
        const unlockedAt = state.achievements[a.id]
        const tier = TIER[a.tier]
        const progress = a.progress?.(snapshot)
        return (
          <motion.li
            key={a.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.4) }}
            className={cn(
              'relative flex min-w-0 gap-3 overflow-hidden rounded-xl border p-3.5',
              unlockedAt ? 'border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]' : 'border-white/[0.05] bg-white/[0.015]',
            )}
          >
            <div className={cn('relative grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br p-0.5', tier.ring, unlockedAt ? tier.glow : 'opacity-60')}>
              <div className="grid size-full place-items-center rounded-full bg-ink-950">
                <Icon name={a.icon} size={30} glow={!!unlockedAt} className={cn(!unlockedAt && 'opacity-30 grayscale')} />
              </div>
              {!unlockedAt && (
                <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-ink-950 ring-1 ring-white/15">
                  <Lock className="size-3 text-slate-400" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={cn('truncate text-sm font-bold', unlockedAt ? 'text-white' : 'text-slate-300')}>{a.title}</p>
                <span className="shrink-0 text-[9px] font-bold tracking-wider text-slate-500 uppercase">{tier.label}</span>
              </div>
              <p className="text-xs leading-snug text-slate-400">{a.description}</p>
              {!unlockedAt && progress && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-emerald" style={{ width: `${(progress[0] / progress[1]) * 100}%` }} />
                  </div>
                  <span className="num text-[10px] text-slate-500">
                    {formatChips(progress[0])}/{formatChips(progress[1])}
                  </span>
                </div>
              )}
              <p className={cn('mt-1.5 text-[11px] font-semibold', unlockedAt ? 'text-neon-emerald' : 'text-gold-300/80')}>
                {unlockedAt ? `Отримано · +${formatChips(a.reward)} фішок` : `Нагорода: ${formatChips(a.reward)} фішок`}
              </p>
            </div>
          </motion.li>
        )
      })}
    </ul>
  )
}
