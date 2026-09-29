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
      style={{ width: size, height: size, filter: 'drop-shadow(0 0 8px rgba(25,245,163,0.25))' }}
      aria-label={`Рівень ${info.level}, ${info.title}. Досвід ${formatChips(info.into)} з ${formatChips(info.span)}`}
      title={`${info.title} · ${formatChips(info.into)} / ${formatChips(info.span)} XP`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="#07090d" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - info.progress) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22e1ff" />
            <stop offset="1" stopColor="#19f5a3" />
          </linearGradient>
        </defs>
      </svg>
      <span className="num absolute inset-0 grid place-items-center text-[13px] font-bold text-white transition group-hover:scale-110">
        {info.level}
      </span>
    </button>
  )
}
