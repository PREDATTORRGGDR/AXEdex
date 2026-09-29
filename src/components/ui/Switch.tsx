import { motion } from 'motion/react'
import { cn } from '../../lib/cn'

/** Neon on/off switch. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-45',
        checked ? 'border-neon-emerald/50 bg-neon-emerald/25 shadow-[0_0_16px_-4px_rgba(25,245,163,0.7)]' : 'border-white/[0.08] bg-ink-950',
      )}
    >
      <motion.span
        className={cn('absolute top-[3px] left-[3px] size-5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)]', checked ? 'bg-neon-emerald' : 'bg-slate-500')}
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      />
    </button>
  )
}
