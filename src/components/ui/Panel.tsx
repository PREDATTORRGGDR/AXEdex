import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean
  children: ReactNode
}

/** Frosted-glass surface used for every card in the app. */
export function Panel({ strong, className, children, ...rest }: PanelProps) {
  return (
    <div className={cn(strong ? 'glass-strong' : 'glass', 'rounded-2xl', className)} {...rest}>
      {children}
    </div>
  )
}

/** Section heading: a neon tick, an uppercase label and an optional action on the right. */
export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex min-w-0 items-center justify-between gap-3', className)}>
      <h2 className="flex min-w-0 items-center gap-2.5 font-display text-[13px] font-bold tracking-[0.18em] text-slate-300 uppercase">
        <span className="h-3.5 w-1 shrink-0 rounded-full bg-neon-emerald shadow-[0_0_10px_rgba(25,245,163,0.8)]" aria-hidden />
        <span className="min-w-0 truncate">{children}</span>
      </h2>
      {action}
    </div>
  )
}
