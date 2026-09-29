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
          <stop offset="0" stopColor="#fbf0cf" />
          <stop offset="0.45" stopColor="#f3cf6e" />
          <stop offset="0.75" stopColor="#d4a543" />
          <stop offset="1" stopColor="#8f651a" />
        </linearGradient>
        <linearGradient id={emerald} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#06885a" />
          <stop offset="1" stopColor="#b6ffe4" />
        </linearGradient>
        <radialGradient id={bg} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#1c2330" />
          <stop offset="1" stopColor="#07090d" />
        </radialGradient>
      </defs>
      <path d="M64 4 116 34v60L64 124 12 94V34Z" fill={`url(#${bg})`} stroke={`url(#${gold})`} strokeWidth="6" strokeLinejoin="round" />
      <path d="M64 15 106 39.5v49L64 113 22 88.5v-49Z" fill="none" stroke="#f3dc9a" strokeOpacity="0.18" strokeWidth="1.5" />
      <path transform="translate(24 24) scale(0.15625)" fill={`url(#${gold})`} d={CROSSED_AXES_PATH} />
      <path d="M64 54 74 64 64 74 54 64Z" fill={`url(#${emerald})`} stroke="#07090d" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => navigate(paths.lobby)}
      className={cn('group flex items-center gap-2.5', className)}
      aria-label="AXEdex — до лобі"
    >
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[60deg] group-hover:drop-shadow-[0_0_12px_rgba(243,207,110,0.6)]" />
      {!collapsed && (
        <span className="font-display text-[26px] leading-none font-black tracking-tight italic">
          <span className="text-gold-gradient">AXE</span>
          <span className="text-emerald-gradient">dex</span>
        </span>
      )}
    </button>
  )
}
