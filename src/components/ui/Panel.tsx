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

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-400 uppercase">{children}</h2>
      {action}
    </div>
  )
}
