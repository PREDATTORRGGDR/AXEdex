import { memo } from 'react'
import { useSvgId } from '../../hooks/useSvgId'
import { cn } from '../../lib/cn'
import { GLYPH_PATHS, type GlyphName } from './glyphData'
import { GLYPH_TONES, type GlyphTone } from './glyphTones'

interface GlyphProps {
  name: GlyphName
  size?: number
  tone?: GlyphTone
  glow?: boolean
  className?: string
  label?: string
}

/** Bright gradient-filled vector glyph with an optional neon glow. */
export const Glyph = memo(function Glyph({ name, size = 24, tone = 'emerald', glow = true, className, label }: GlyphProps) {
  const id = useSvgId('glyph')
  const [a, b, c] = GLYPH_TONES[tone]
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('shrink-0', className)}
      style={glow ? { filter: `drop-shadow(0 0 ${Math.max(3, size * 0.16)}px ${b}73)` } : undefined}
    >
      <defs>
        <linearGradient id={id} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.45" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} dangerouslySetInnerHTML={{ __html: GLYPH_PATHS[name] }} />
    </svg>
  )
})

export type { GlyphName }
