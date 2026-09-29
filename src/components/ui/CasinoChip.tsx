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

/**
 * Heavy clay chip seen from slightly above: a darker rim below the face gives
 * it thickness, the face carries edge inserts, a dashed inlay and a lit bevel.
 */
export function CasinoChip({ value, size = 44, className, label }: CasinoChipProps) {
  const s = chipStyle(value)
  const shineId = useSvgId('chip-shine')
  const faceId = useSvgId('chip-face')
  const text = label ?? String(value)
  const fontSize = text.length >= 4 ? 19 : text.length === 3 ? 24 : 30
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('drop-shadow-[0_4px_5px_rgba(0,0,0,0.6)]', className)} aria-hidden>
      <defs>
        <radialGradient id={shineId} cx="38%" cy="26%" r="70%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
        <clipPath id={faceId}>
          <circle cx="50" cy="46" r="44" />
        </clipPath>
      </defs>
      {/* Thickness */}
      <circle cx="50" cy="53" r="44" fill={s.side} />
      <g clipPath={`url(#${faceId})`} transform="translate(0 7)" opacity="0.9">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="44" y="0" width="12" height="16" fill={s.edge} opacity="0.55" transform={`rotate(${i * 45 + 22.5} 50 46)`} />
        ))}
      </g>
      {/* Face */}
      <circle cx="50" cy="46" r="44" fill={s.base} />
      <g clipPath={`url(#${faceId})`}>
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="44" y="0" width="12" height="14" rx="1.5" fill={s.edge} transform={`rotate(${i * 45 + 22.5} 50 46)`} />
        ))}
      </g>
      <circle cx="50" cy="46" r="30.5" fill="none" stroke={s.edge} strokeWidth="2" strokeDasharray="3.2 2.6" opacity="0.9" />
      <circle cx="50" cy="46" r="26" fill={s.base} stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />
      <circle cx="50" cy="46" r="44" fill={`url(#${shineId})`} />
      <circle cx="50" cy="46" r="43.3" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
      {text && (
        <text
          x="50"
          y="47.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'Exo 2 Variable', 'Exo 2', system-ui, sans-serif"
          fontWeight="900"
          fontSize={fontSize}
          fill={s.ink}
          style={{ paintOrder: 'stroke' }}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1"
        >
          {text}
        </text>
      )}
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

/** Recessed rack of chips; the selected one lifts out with a neon ring. */
export function ChipSelector({ value, onChange, values = CHIP_VALUES, balance, className }: ChipSelectorProps) {
  return (
    <div
      className={cn('well flex items-end justify-between gap-1 rounded-2xl px-2 pt-3 pb-2 sm:justify-start sm:gap-2 sm:px-3', className)}
      role="radiogroup"
      aria-label="Номінал фішки"
    >
      {values.map((v) => {
        const selected = v === value
        const affordable = balance === undefined || v <= balance
        return (
          <motion.button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Фішка ${v}`}
            onClick={() => onChange(v)}
            animate={{ y: selected ? -7 : 0, scale: selected ? 1.08 : 1 }}
            whileHover={{ y: selected ? -7 : -3 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 520, damping: 26 }}
            className={cn('relative shrink-0 rounded-full', !affordable && 'opacity-30 saturate-50')}
          >
            {selected && <span className="absolute inset-0 -z-0 rounded-full bg-neon-emerald/35 blur-md" aria-hidden />}
            <CasinoChip value={v} size={42} className="relative sm:size-12" />
            {selected && (
              <motion.span
                layoutId="chip-selected-dot"
                className="absolute -bottom-2 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-neon-emerald shadow-[0_0_10px_rgba(25,245,163,0.9)]"
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
