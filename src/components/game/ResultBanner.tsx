import { AnimatePresence, motion } from 'motion/react'
import type { GameResult, ResultKind } from '../../hooks/useResultBanner'
import { cn } from '../../lib/cn'
import { formatChips, formatMultiplier } from '../../lib/format'

const STYLES: Record<ResultKind, { text: string; glow: string; border: string }> = {
  win: { text: 'text-emerald-300 text-glow-green', glow: 'bg-emerald-400/25', border: 'border-emerald-400/40' },
  bigwin: { text: 'text-gold-gradient', glow: 'bg-gold-400/30', border: 'border-gold-300/60' },
  lose: { text: 'text-rose-300', glow: 'bg-rose-500/20', border: 'border-rose-400/30' },
  push: { text: 'text-sky-200', glow: 'bg-sky-400/20', border: 'border-sky-300/30' },
  info: { text: 'text-violet-200', glow: 'bg-violet-400/20', border: 'border-violet-300/30' },
}

/** Centered animated banner for round outcomes. Render inside a `relative` container. */
export function ResultBanner({ result, className }: { result: GameResult | null; className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 z-30 grid place-items-center', className)}>
      <AnimatePresence>
        {result && (
          <motion.div
            key={`${result.kind}-${result.title}-${result.amount}`}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={cn(
              'glass-strong relative overflow-hidden rounded-3xl border px-7 py-4 text-center sm:px-10 sm:py-5',
              STYLES[result.kind].border,
            )}
          >
            <div className={cn('absolute -inset-10 -z-10 blur-3xl', STYLES[result.kind].glow)} />
            <p className={cn('font-display text-2xl font-black tracking-wide uppercase sm:text-4xl', STYLES[result.kind].text)}>
              {result.title}
            </p>
            {result.amount !== undefined && result.amount !== 0 && (
              <p className="mt-1 text-lg font-bold text-white tabular-nums sm:text-2xl">
                {result.amount > 0 ? '+' : ''}
                {formatChips(result.amount)}
                {result.multiplier !== undefined && (
                  <span className="ml-2 text-sm font-semibold text-slate-300">{formatMultiplier(result.multiplier)}</span>
                )}
              </p>
            )}
            {result.subtitle && <p className="mt-1 text-xs font-medium text-slate-300 sm:text-sm">{result.subtitle}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
