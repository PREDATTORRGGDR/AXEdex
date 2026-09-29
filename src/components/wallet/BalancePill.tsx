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

/** Header balance well with a rolling counter and floating +/− deltas. */
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
      className={cn('well relative flex h-10 min-w-0 items-center gap-2 rounded-xl pr-3 pl-1.5 sm:h-11 sm:pr-4', className)}
      title={inPlay > 0 ? `У грі: ${formatChips(inPlay)}` : undefined}
    >
      <motion.div key={delta?.id ?? 'chip'} className="shrink-0" initial={{ rotateY: 0 }} animate={{ rotateY: delta ? 360 : 0 }} transition={{ duration: 0.6 }}>
        <CasinoChip value={1000} size={26} label="" />
      </motion.div>
      <div className="flex min-w-0 flex-col leading-none">
        <span className="text-[8.5px] font-bold tracking-[0.22em] text-slate-500 uppercase">Баланс</span>
        <AnimatedNumber value={balance} className="num mt-0.5 truncate text-[15px] font-bold text-white sm:text-base" />
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
              'num pointer-events-none absolute top-full right-2 rounded-md px-1.5 py-0.5 text-xs font-bold ring-1',
              delta.value > 0 ? 'bg-ink-950/90 text-neon-emerald ring-neon-emerald/30' : 'bg-ink-950/90 text-neon-red ring-neon-red/30',
            )}
          >
            {formatSigned(delta.value)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
