import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { formatChips, formatSigned } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { CasinoChip } from '../ui/CasinoChip'

interface Delta {
  id: number
  value: number
}

/** Header balance with a rolling counter and floating +/− deltas. */
export function BalancePill({ className }: { className?: string }) {
  const balance = useCasino((s) => s.balance)
  const inPlay = useCasino((s) => s.openRounds.reduce((sum, r) => sum + r.wager, 0))
  const prev = useRef(balance)
  const [delta, setDelta] = useState<Delta | null>(null)

  useEffect(() => {
    const diff = balance - prev.current
    prev.current = balance
    if (diff === 0) return
    setDelta({ id: Date.now(), value: diff })
    const t = window.setTimeout(() => setDelta(null), 1400)
    return () => window.clearTimeout(t)
  }, [balance])

  return (
    <div
      className={cn(
        'gold-border relative flex h-11 items-center gap-2 rounded-2xl pr-3.5 pl-1.5 shadow-[0_0_24px_-8px_rgb(245_197_66/0.5)]',
        className,
      )}
      title={inPlay > 0 ? `В игре: ${formatChips(inPlay)}` : undefined}
    >
      <motion.div
        key={delta?.id ?? 'chip'}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: delta ? 360 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <CasinoChip value={1000} size={30} label="" />
      </motion.div>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-bold tracking-[0.2em] text-gold-300/70 uppercase">Баланс</span>
        <AnimatedNumber value={balance} className="text-base font-extrabold text-white tabular-nums sm:text-lg" />
      </div>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 22 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'pointer-events-none absolute top-full right-2 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums',
              delta.value > 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300',
            )}
          >
            {formatSigned(delta.value)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
