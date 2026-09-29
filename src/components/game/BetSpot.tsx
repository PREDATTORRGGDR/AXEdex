import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { chipLabel } from '../../lib/chips'
import { cn } from '../../lib/cn'
import { CasinoChip } from '../ui/CasinoChip'

interface BetSpotProps {
  label: ReactNode
  /** Payout hint such as «1:1». */
  odds?: string
  amount?: number
  onClick: () => void
  disabled?: boolean
  state?: 'win' | 'lose' | 'push' | null
  tone?: 'blue' | 'red' | 'green' | 'gold' | 'felt'
  className?: string
  compact?: boolean
  ariaLabel: string
}

const TONES = {
  blue: 'border-sky-300/40 bg-sky-500/15 hover:bg-sky-500/25',
  red: 'border-rose-300/40 bg-rose-500/15 hover:bg-rose-500/25',
  green: 'border-emerald-300/40 bg-emerald-500/15 hover:bg-emerald-500/25',
  gold: 'border-gold-300/40 bg-gold-400/15 hover:bg-gold-400/25',
  felt: 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09]',
}

/** A clickable betting area on a felt table that shows the stacked chip. */
export function BetSpot({ label, odds, amount = 0, onClick, disabled, state, tone = 'felt', className, compact, ariaLabel }: BetSpotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${ariaLabel}${odds ? `, выплата ${odds}` : ''}${amount ? `, ставка ${amount}` : ''}`}
      className={cn(
        'relative flex min-w-0 flex-col items-center justify-center rounded-2xl border text-center transition-[background-color,box-shadow,opacity] disabled:cursor-default',
        compact ? 'min-h-14 gap-0.5 px-1 py-1.5' : 'min-h-24 gap-1 px-2 py-3',
        TONES[tone],
        state === 'win' && 'shadow-[0_0_0_2px_rgba(52,245,160,0.9),0_0_30px_rgba(52,245,160,0.45)]',
        state === 'lose' && 'opacity-45',
        state === 'push' && 'shadow-[0_0_0_2px_rgba(125,211,252,0.7)]',
        className,
      )}
    >
      <span className={cn('leading-tight font-black text-white', compact ? 'text-xs' : 'text-sm sm:text-base')}>{label}</span>
      {odds && <span className={cn('font-semibold text-gold-200/80', compact ? 'text-[9px]' : 'text-[11px]')}>{odds}</span>}
      <AnimatePresence>
        {amount > 0 && (
          <motion.span
            key="chip"
            initial={{ scale: 0, y: -16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
            className={cn('pointer-events-none absolute', compact ? '-top-2 -right-2' : '-top-3 -right-3')}
          >
            <motion.span key={amount} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="block">
              <CasinoChip value={amount} size={compact ? 26 : 34} label={chipLabel(amount)} />
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
