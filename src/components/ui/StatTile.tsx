import type { LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  accent?: 'gold' | 'emerald' | 'violet' | 'cyan' | 'rose'
  className?: string
  index?: number
}

const ACCENTS = {
  gold: 'bg-gold-400/12 text-gold-300',
  emerald: 'bg-emerald-400/12 text-emerald-300',
  violet: 'bg-violet-400/12 text-violet-300',
  cyan: 'bg-cyan-400/12 text-cyan-300',
  rose: 'bg-rose-400/12 text-rose-300',
}

/** KPI tile: label, headline value and an optional hint line. */
export function StatTile({ label, value, hint, icon: Icon, accent = 'gold', className, index = 0 }: StatTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={cn('glass relative overflow-hidden rounded-2xl p-4', className)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        {Icon && (
          <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', ACCENTS[accent])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </motion.div>
  )
}
