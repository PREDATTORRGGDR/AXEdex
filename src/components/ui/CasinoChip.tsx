import { motion } from 'motion/react'
import { CHIP_VALUES, chipStyle } from '../../lib/chips'
import { useSvgId } from '../../hooks/useSvgId'
import { cn } from '../../lib/cn'

interface CasinoChipProps {
  value: number
  size?: number
  className?: string
  label?: string
}

/** Vector casino chip with edge inserts, sized in pixels. */
export function CasinoChip({ value, size = 44, className, label }: CasinoChipProps) {
  const s = chipStyle(value)
  const shineId = useSvgId('chip-shine')
  const text = label ?? String(value)
  const fontSize = text.length >= 4 ? 21 : text.length === 3 ? 26 : 32
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('drop-shadow-[0_3px_4px_rgba(0,0,0,0.55)]', className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={shineId} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={s.base} />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x="44"
          y="2"
          width="12"
          height="15"
          rx="2"
          fill={s.edge}
          transform={`rotate(${i * 45} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="33" fill={s.base} stroke={s.edge} strokeWidth="2.5" strokeDasharray="4 3" />
      <circle cx="50" cy="50" r="27" fill={s.base} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <circle cx="50" cy="50" r="48" fill={`url(#${shineId})`} />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        fill={s.ink}
      >
        {text}
      </text>
    </svg>
  )
}

interface ChipSelectorProps {
  value: number
  onChange: (value: number) => void
  values?: readonly number[]
  balance?: number
  className?: string
}

/** Horizontal rack for picking a chip denomination. */
export function ChipSelector({ value, onChange, values = CHIP_VALUES, balance, className }: ChipSelectorProps) {
  return (
    <div className={cn('flex items-end gap-1.5 sm:gap-2', className)} role="radiogroup" aria-label="Номинал фишки">
      {values.map((v) => {
        const selected = v === value
        const affordable = balance === undefined || v <= balance
        return (
          <motion.button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Фишка ${v}`}
            onClick={() => onChange(v)}
            animate={{ y: selected ? -8 : 0, scale: selected ? 1.08 : 1 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            className={cn(
              'relative rounded-full transition-opacity',
              !affordable && 'opacity-35',
              selected && 'drop-shadow-[0_0_14px_rgba(245,197,66,0.7)]',
            )}
          >
            <CasinoChip value={v} size={44} className="sm:size-12" />
            {selected && (
              <motion.span
                layoutId="chip-selected-dot"
                className="absolute -bottom-2.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-gold-300 shadow-glow-gold"
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
