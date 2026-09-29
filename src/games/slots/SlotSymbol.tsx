import { Glyph } from '../../components/ui/Glyph'
import { GLYPH_TONES, type GlyphTone } from '../../components/ui/glyphTones'
import type { GlyphName } from '../../components/ui/glyphData'
import { cn } from '../../lib/cn'
import type { SymbolId } from './logic'

const GLYPHS: Record<Exclude<SymbolId, 'seven'>, { glyph: GlyphName; tone: GlyphTone }> = {
  cherry: { glyph: 'cherry', tone: 'rose' },
  lemon: { glyph: 'lemon', tone: 'gold' },
  grape: { glyph: 'grapes', tone: 'violet' },
  clover: { glyph: 'clover', tone: 'emerald' },
  bell: { glyph: 'ringing-bell', tone: 'orange' },
  gem: { glyph: 'cut-diamond', tone: 'cyan' },
  crown: { glyph: 'crown', tone: 'gold' },
  wild: { glyph: 'flat-star', tone: 'gold' },
  scatter: { glyph: 'sparkles', tone: 'pink' },
}

/** Neon-lit reel symbol that scales with its cell. */
export function SlotSymbol({ id, size, className }: { id: SymbolId; size: number; className?: string }) {
  let content: React.ReactNode
  if (id === 'seven') {
    const color = '#ff2e63'
    content = (
      <span
        className="font-display leading-none font-black italic"
        style={{
          fontSize: size * 0.62,
          color: '#ffe4ea',
          textShadow: `0 0 ${size * 0.05}px #fff, 0 0 ${size * 0.12}px ${color}, 0 0 ${size * 0.25}px ${color}, 0 0 ${size * 0.4}px ${color}`,
          WebkitTextStroke: `${Math.max(1, size * 0.02)}px ${color}`,
        }}
      >
        7
      </span>
    )
  } else {
    const { glyph, tone } = GLYPHS[id]
    const labelled = id === 'wild' || id === 'scatter'
    const iconSize = size * (labelled ? 0.48 : 0.6)
    content = (
      <span className="flex flex-col items-center">
        <Glyph name={glyph} tone={tone} size={iconSize} />
        {labelled && (
          <span
            className="font-display leading-none font-black tracking-wider"
            style={{ fontSize: Math.max(8, size * 0.13), color: GLYPH_TONES[tone][0], textShadow: `0 0 ${size * 0.08}px ${GLYPH_TONES[tone][1]}` }}
          >
            {id === 'wild' ? 'ВАЙЛД' : 'БОНУС'}
          </span>
        )}
      </span>
    )
  }

  return (
    <div className={cn('grid place-items-center', className)} style={{ width: size, height: size }}>
      {content}
    </div>
  )
}
