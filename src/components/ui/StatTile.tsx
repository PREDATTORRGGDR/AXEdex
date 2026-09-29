import type { LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon as GlyphIcon } from './Icon'
import type { IconName } from './iconNames'

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  emoji?: IconName
  accent?: 'gold' | 'emerald' | 'violet' | 'cyan' | 'rose'
  className?: string
  index?: number
}

const ACCENTS = {
  gold: { chip: 'bg-gold-400/10 text-gold-300 ring-gold-300/20', bar: 'from-gold-300/70' },
  emerald: { chip: 'bg-neon-emerald/10 text-neon-emerald ring-neon-emerald/20', bar: 'from-neon-emerald/70' },
  violet: { chip: 'bg-neon-violet/10 text-neon-violet ring-neon-violet/20', bar: 'from-neon-violet/70' },
  cyan: { chip: 'bg-neon-cyan/10 text-neon-cyan ring-neon-cyan/20', bar: 'from-neon-cyan/70' },
  rose: { chip: 'bg-neon-red/10 text-neon-red ring-neon-red/20', bar: 'from-neon-red/70' },
}

/** KPI tile: label, headline value and an optional hint line. */
export function StatTile({ label, value, hint, icon: Icon, emoji, accent = 'gold', className, index = 0 }: StatTileProps) {
  const a = ACCENTS[accent]
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className={cn('glass group relative min-w-0 overflow-hidden rounded-2xl p-3.5 sm:p-4', className)}
    >
      <span className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent', a.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[10.5px] leading-tight font-bold tracking-[0.12em] text-slate-500 uppercase sm:text-[11px]">{label}</p>
        {(emoji || Icon) && (
          <span className={cn('-mt-0.5 -mr-0.5 grid size-8 shrink-0 place-items-center rounded-lg ring-1', a.chip)}>
            {emoji ? <GlyphIcon name={emoji} size={20} /> : Icon && <Icon className="size-4" />}
          </span>
        )}
      </div>
      <p className="num mt-1.5 truncate text-xl font-bold text-white sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">{hint}</p>}
    </motion.div>
  )
}
