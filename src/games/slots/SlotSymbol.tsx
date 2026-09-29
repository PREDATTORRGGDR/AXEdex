import { Bell, Cherry, Citrus, Clover, Crown, Diamond, Grape, Sparkles, Star, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { SymbolId } from './logic'

const ICONS: Partial<Record<SymbolId, { icon: LucideIcon; color: string }>> = {
  cherry: { icon: Cherry, color: '#ff4d6d' },
  lemon: { icon: Citrus, color: '#fde047' },
  grape: { icon: Grape, color: '#b794ff' },
  clover: { icon: Clover, color: '#34f5a0' },
  bell: { icon: Bell, color: '#fcd96b' },
  gem: { icon: Diamond, color: '#22d3ee' },
  crown: { icon: Crown, color: '#fb923c' },
}

function symbolColor(id: SymbolId): string {
  if (id === 'seven') return '#ff2e63'
  if (id === 'wild') return '#fcd96b'
  if (id === 'scatter') return '#f472d0'
  return ICONS[id]!.color
}

/** Neon-lit reel symbol that scales with its cell. */
export function SlotSymbol({ id, size, className }: { id: SymbolId; size: number; className?: string }) {
  const color = symbolColor(id)
  const glow = { filter: `drop-shadow(0 0 ${size * 0.08}px ${color}) drop-shadow(0 0 ${size * 0.18}px ${color}88)` }
  const iconSize = size * 0.56

  let content: React.ReactNode
  if (id === 'seven') {
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
  } else if (id === 'wild') {
    content = (
      <span className="flex flex-col items-center" style={glow}>
        <Star style={{ width: iconSize * 0.9, height: iconSize * 0.9, color }} fill={color} strokeWidth={1.5} />
        <span className="font-display font-black tracking-wider" style={{ fontSize: Math.max(8, size * 0.13), color: '#fff4d1' }}>
          ВАЙЛД
        </span>
      </span>
    )
  } else if (id === 'scatter') {
    content = (
      <span className="flex flex-col items-center" style={glow}>
        <Sparkles style={{ width: iconSize * 0.9, height: iconSize * 0.9, color }} strokeWidth={1.6} />
        <span className="font-display font-black tracking-wider" style={{ fontSize: Math.max(8, size * 0.13), color: '#fce7f3' }}>
          БОНУС
        </span>
      </span>
    )
  } else {
    const { icon: Icon } = ICONS[id]!
    content = <Icon style={{ width: iconSize, height: iconSize, color, ...glow }} strokeWidth={1.7} />
  }

  return (
    <div className={cn('grid place-items-center', className)} style={{ width: size, height: size }}>
      {content}
    </div>
  )
}
