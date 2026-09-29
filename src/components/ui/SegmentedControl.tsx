import { motion } from 'motion/react'
import { useId } from 'react'
import { sfx } from '../../audio/sfx'
import { cn } from '../../lib/cn'

interface SegmentedControlProps<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
  label?: string
}

export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
  className,
  size = 'md',
  label,
}: SegmentedControlProps<T>) {
  const id = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'flex rounded-xl border border-white/10 bg-ink-950/60 p-1',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (active) return
              sfx.play('click')
              onChange(o.value)
            }}
            className={cn(
              'relative flex-1 rounded-lg font-semibold transition-colors',
              size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm',
              active ? 'text-ink-950' : 'text-slate-400 hover:text-slate-100',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-[linear-gradient(180deg,#fff0bd,#fcd96b_40%,#e2ab1c)] shadow-glow-gold"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
