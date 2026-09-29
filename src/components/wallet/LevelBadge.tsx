import { motion } from 'motion/react'
import { useSvgId } from '../../hooks/useSvgId'
import { cn } from '../../lib/cn'
import { formatChips } from '../../lib/format'
import { navigate, paths } from '../../router/router'
import { useCasino } from '../../store/casino'
import { levelFromXp } from '../../store/progression'

/** Circular XP ring with the current level; links to the profile. */
export function LevelBadge({ size = 44, className }: { size?: number; className?: string }) {
  const xp = useCasino((s) => s.xp)
  const gradId = useSvgId('xp-grad')
  const info = levelFromXp(xp)
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  return (
    <button
      type="button"
      onClick={() => navigate(paths.profile)}
      className={cn('group relative shrink-0 rounded-full', className)}
      style={{ width: size, height: size }}
      aria-label={`Уровень ${info.level}, ${info.title}. Опыт ${formatChips(info.into)} из ${formatChips(info.span)}`}
      title={`${info.title} · ${formatChips(info.into)} / ${formatChips(info.span)} XP`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgb(7 11 24 / 0.8)" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - info.progress) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#34f5a0" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-black text-white transition group-hover:scale-110">
        {info.level}
      </span>
    </button>
  )
}
