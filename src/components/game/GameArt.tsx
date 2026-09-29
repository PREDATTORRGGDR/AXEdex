import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { ArtMotif, GameMeta } from '../../games/meta'

/** Decorative vector motif per game family, drawn in white at low opacity. */
function Motif({ motif }: { motif: ArtMotif }): ReactNode {
  const stroke = 'rgba(255,255,255,0.22)'
  switch (motif) {
    case 'rings':
    case 'wheel':
      return (
        <g fill="none" stroke={stroke}>
          <circle cx="250" cy="70" r="92" strokeWidth="2" />
          <circle cx="250" cy="70" r="70" strokeWidth="10" strokeDasharray={motif === 'wheel' ? '28 8' : '10 10'} />
          <circle cx="250" cy="70" r="40" strokeWidth="2" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="250" y1="70" x2={250 + 92 * Math.cos((i * Math.PI) / 6)} y2={70 + 92 * Math.sin((i * Math.PI) / 6)} strokeWidth="1" />
          ))}
        </g>
      )
    case 'cards':
      return (
        <g fill="rgba(255,255,255,0.06)" stroke={stroke} strokeWidth="2">
          <rect x="190" y="18" width="70" height="98" rx="10" transform="rotate(-16 225 67)" />
          <rect x="220" y="14" width="70" height="98" rx="10" transform="rotate(-2 255 63)" />
          <rect x="250" y="20" width="70" height="98" rx="10" transform="rotate(12 285 69)" />
        </g>
      )
    case 'reels':
      return (
        <g fill="rgba(255,255,255,0.05)" stroke={stroke} strokeWidth="2">
          {[0, 1, 2].map((i) => (
            <rect key={i} x={180 + i * 48} y="12" width="40" height="112" rx="8" />
          ))}
          <line x1="170" y1="68" x2="330" y2="68" strokeDasharray="6 5" />
        </g>
      )
    case 'curve':
      return (
        <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round">
          <path d="M150 130 C 230 128, 280 100, 320 10" />
          <path d="M150 130 C 230 128, 280 100, 320 10 L 320 140 L 150 140 Z" fill="rgba(255,255,255,0.06)" stroke="none" />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1="150" y1={30 + i * 30} x2="330" y2={30 + i * 30} strokeWidth="1" opacity="0.4" />
          ))}
        </g>
      )
    case 'pegs':
      return (
        <g fill={stroke}>
          {Array.from({ length: 6 }, (_, row) =>
            Array.from({ length: row + 3 }, (_, i) => (
              <circle key={`${row}-${i}`} cx={255 - (row + 2) * 10 + i * 20} cy={18 + row * 20} r="3.2" />
            )),
          )}
        </g>
      )
    case 'grid':
      return (
        <g fill="rgba(255,255,255,0.05)" stroke={stroke} strokeWidth="1.5">
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect key={`${r}-${c}`} x={196 + c * 30} y={10 + r * 30} width="24" height="24" rx="6" />
            )),
          )}
        </g>
      )
    case 'dice':
      return (
        <g fill="rgba(255,255,255,0.06)" stroke={stroke} strokeWidth="2">
          <rect x="200" y="22" width="62" height="62" rx="14" transform="rotate(-14 231 53)" />
          <rect x="258" y="52" width="62" height="62" rx="14" transform="rotate(10 289 83)" />
          {[
            [218, 40],
            [231, 53],
            [244, 66],
            [276, 70],
            [302, 70],
            [276, 96],
            [302, 96],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="4.5" fill={stroke} stroke="none" />
          ))}
        </g>
      )
    case 'arrows':
      return (
        <g fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M230 90 L230 20 M205 45 L230 20 L255 45" />
          <path d="M290 40 L290 110 M265 85 L290 110 L315 85" />
        </g>
      )
  }
}

interface GameArtProps {
  game: GameMeta
  className?: string
  iconSize?: string
}

/** Procedural cover art: gradient, motif, glow and the game's icon. */
export function GameArt({ game, className, iconSize = 'size-12' }: GameArtProps) {
  const Icon = game.icon
  const [from, to] = game.colors
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ background: `radial-gradient(120% 120% at 0% 0%, ${from} 0%, ${to} 55%, #060914 100%)` }}
    >
      <svg viewBox="0 0 340 140" preserveAspectRatio="xMaxYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <Motif motif={game.motif} />
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_100%,rgba(255,255,255,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 grid place-items-center rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/20 backdrop-blur-md">
        <Icon className={cn(iconSize, 'text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]')} strokeWidth={1.6} />
      </div>
    </div>
  )
}
