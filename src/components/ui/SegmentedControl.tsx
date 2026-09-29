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

/** Recessed track with a raised emerald thumb that slides to the active option. */
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
      className={cn('well flex rounded-xl p-1', disabled && 'pointer-events-none opacity-50', className)}
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
              'relative min-w-0 flex-1 rounded-lg font-bold whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 px-2.5 text-[13px]',
              active ? 'text-[#03140d]' : 'text-slate-400 hover:text-slate-100',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-[linear-gradient(180deg,#7dffd0,#19f5a3_45%,#0bb877)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_2px_0_#05603f,0_0_16px_-2px_rgba(25,245,163,0.6)]"
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
