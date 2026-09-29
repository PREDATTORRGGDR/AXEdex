import { useSvgId } from '../../hooks/useSvgId'
import { cn } from '../../lib/cn'
import { navigate, paths } from '../../router/router'
import { CROSSED_AXES_PATH } from './logoPaths'

/** Brand emblem: a gold hexagon with crossed axes (the "X" of AXEdex) and an emerald gem. */
export function LogoMark({ className }: { className?: string }) {
  const gold = useSvgId('logo-g')
  const emerald = useSvgId('logo-e')
  const bg = useSvgId('logo-b')
  return (
    <svg viewBox="0 0 128 128" className={cn('size-10', className)} aria-hidden>
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff4d1" />
          <stop offset="0.45" stopColor="#fcd96b" />
          <stop offset="0.75" stopColor="#e2ab1c" />
          <stop offset="1" stopColor="#8a620d" />
        </linearGradient>
        <linearGradient id={emerald} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#047857" />
          <stop offset="1" stopColor="#a7ffd9" />
        </linearGradient>
        <radialGradient id={bg} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#16214a" />
          <stop offset="1" stopColor="#070b18" />
        </radialGradient>
      </defs>
      <path d="M64 4 116 34v60L64 124 12 94V34Z" fill={`url(#${bg})`} stroke={`url(#${gold})`} strokeWidth="6" strokeLinejoin="round" />
      <path d="M64 15 106 39.5v49L64 113 22 88.5v-49Z" fill="none" stroke="#fcd96b" strokeOpacity="0.2" strokeWidth="1.5" />
      <path transform="translate(24 24) scale(0.15625)" fill={`url(#${gold})`} d={CROSSED_AXES_PATH} />
      <path d="M64 54 74 64 64 74 54 64Z" fill={`url(#${emerald})`} stroke="#0a1022" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => navigate(paths.lobby)}
      className={cn('group flex items-center gap-2.5', className)}
      aria-label="AXEdex — в лобби"
    >
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[60deg] group-hover:drop-shadow-[0_0_12px_rgba(252,217,107,0.6)]" />
      {!collapsed && (
        <span className="font-display text-2xl leading-none font-black tracking-tight">
          <span className="text-gold-gradient">AXE</span>
          <span className="text-emerald-300 text-glow-green">dex</span>
        </span>
      )}
    </button>
  )
}
