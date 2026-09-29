import { AnimatePresence, motion } from 'motion/react'
import type { GameResult, ResultKind } from '../../hooks/useResultBanner'
import { cn } from '../../lib/cn'
import { formatChips, formatMultiplier } from '../../lib/format'

const STYLES: Record<ResultKind, { text: string; ring: string; line: string; tag: string }> = {
  win: {
    text: 'text-emerald-gradient',
    ring: 'shadow-[0_0_0_1px_rgba(25,245,163,0.45),0_0_60px_-10px_rgba(25,245,163,0.55),0_30px_60px_-20px_rgba(0,0,0,1)]',
    line: 'via-neon-emerald',
    tag: 'Виграш',
  },
  bigwin: {
    text: 'text-gold-gradient',
    ring: 'shadow-[0_0_0_1px_rgba(243,220,154,0.6),0_0_80px_-10px_rgba(230,194,106,0.65),0_30px_60px_-20px_rgba(0,0,0,1)]',
    line: 'via-gold-200',
    tag: 'Великий виграш',
  },
  lose: {
    text: 'text-[#ff8da1]',
    ring: 'shadow-[0_0_0_1px_rgba(255,77,109,0.35),0_0_50px_-14px_rgba(255,77,109,0.45),0_30px_60px_-20px_rgba(0,0,0,1)]',
    line: 'via-neon-red',
    tag: 'Програш',
  },
  push: {
    text: 'text-sky-200',
    ring: 'shadow-[0_0_0_1px_rgba(34,225,255,0.3),0_30px_60px_-20px_rgba(0,0,0,1)]',
    line: 'via-neon-cyan',
    tag: 'Повернення',
  },
  info: {
    text: 'text-violet-200',
    ring: 'shadow-[0_0_0_1px_rgba(157,123,255,0.35),0_30px_60px_-20px_rgba(0,0,0,1)]',
    line: 'via-neon-violet',
    tag: 'Раунд',
  },
}

/** Centered animated banner for round outcomes. Render inside a `relative` container. */
export function ResultBanner({ result, className }: { result: GameResult | null; className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 z-30 grid place-items-center p-3', className)}>
      <AnimatePresence>
        {result && (
          <motion.div
            key={`${result.kind}-${result.title}-${result.amount}`}
            initial={{ opacity: 0, scale: 0.7, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            className={cn('relative max-w-full overflow-hidden rounded-2xl bg-ink-950/90 px-6 py-3.5 text-center sm:px-10 sm:py-5', STYLES[result.kind].ring)}
          >
            <span className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent', STYLES[result.kind].line)} aria-hidden />
            <p className="text-[10px] font-bold tracking-[0.3em] text-slate-500 uppercase">{STYLES[result.kind].tag}</p>
            <p className={cn('mt-0.5 font-display text-2xl leading-tight font-black tracking-wide uppercase sm:text-4xl', STYLES[result.kind].text)}>
              {result.title}
            </p>
            {result.amount !== undefined && result.amount !== 0 && (
              <p className={cn('num mt-1 text-lg font-bold sm:text-2xl', result.amount > 0 ? 'text-white' : 'text-slate-400')}>
                {result.amount > 0 ? '+' : '−'}
                {formatChips(Math.abs(result.amount))}
                {result.multiplier !== undefined && <span className="ml-2 text-sm font-semibold text-slate-400">{formatMultiplier(result.multiplier)}</span>}
              </p>
            )}
            {result.subtitle && <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">{result.subtitle}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
