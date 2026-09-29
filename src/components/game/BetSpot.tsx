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
  blue: 'border-neon-cyan/25 bg-[linear-gradient(180deg,rgba(34,225,255,0.12),rgba(34,225,255,0.03))] hover:border-neon-cyan/50 hover:shadow-[0_0_24px_-8px_rgba(34,225,255,0.6)]',
  red: 'border-neon-red/25 bg-[linear-gradient(180deg,rgba(255,77,109,0.12),rgba(255,77,109,0.03))] hover:border-neon-red/50 hover:shadow-[0_0_24px_-8px_rgba(255,77,109,0.6)]',
  green: 'border-neon-emerald/25 bg-[linear-gradient(180deg,rgba(25,245,163,0.12),rgba(25,245,163,0.03))] hover:border-neon-emerald/50 hover:shadow-[0_0_24px_-8px_rgba(25,245,163,0.6)]',
  gold: 'border-gold-300/25 bg-[linear-gradient(180deg,rgba(230,194,106,0.12),rgba(230,194,106,0.03))] hover:border-gold-300/50 hover:shadow-[0_0_24px_-8px_rgba(230,194,106,0.6)]',
  felt: 'border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] hover:border-white/20 hover:bg-white/[0.07]',
}

/** A clickable betting area on a table that shows the stacked chip. */
export function BetSpot({ label, odds, amount = 0, onClick, disabled, state, tone = 'felt', className, compact, ariaLabel }: BetSpotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${ariaLabel}${odds ? `, виплата ${odds}` : ''}${amount ? `, ставка ${amount}` : ''}`}
      className={cn(
        'relative flex min-w-0 flex-col items-center justify-center rounded-xl border text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[background-color,box-shadow,opacity,border-color] duration-200 disabled:cursor-default',
        compact ? 'min-h-14 gap-0.5 px-1 py-1.5' : 'min-h-24 gap-1 px-2 py-3',
        TONES[tone],
        state === 'win' && '!border-neon-emerald shadow-[0_0_0_1px_rgba(25,245,163,0.9),0_0_32px_-4px_rgba(25,245,163,0.55)]',
        state === 'lose' && 'opacity-40',
        state === 'push' && '!border-neon-cyan/70',
        className,
      )}
    >
      <span className={cn('max-w-full leading-tight font-bold break-words text-white', compact ? 'text-xs' : 'font-display text-sm sm:text-base')}>{label}</span>
      {odds && <span className={cn('num font-semibold text-gold-200/80', compact ? 'text-[9px]' : 'text-[11px]')}>{odds}</span>}
      <AnimatePresence>
        {amount > 0 && (
          <motion.span
            key="chip"
            initial={{ scale: 0, y: -16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
            className={cn('pointer-events-none absolute z-10', compact ? '-top-2 -right-2' : '-top-3 -right-3')}
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
