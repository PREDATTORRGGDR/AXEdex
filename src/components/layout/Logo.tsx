import { useSvgId } from '../../hooks/useSvgId'
import { cn } from '../../lib/cn'
import { navigate, paths } from '../../router/router'

/** Hexagonal gold emblem with a crossed "X" blade in emerald. */
export function LogoMark({ className }: { className?: string }) {
  const gold = useSvgId('logo-g')
  const emerald = useSvgId('logo-e')
  return (
    <svg viewBox="0 0 64 64" className={cn('size-9', className)} aria-hidden>
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff4d1" />
          <stop offset="0.5" stopColor="#fcd96b" />
          <stop offset="1" stopColor="#b98511" />
        </linearGradient>
        <linearGradient id={emerald} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#a7ffd9" />
        </linearGradient>
      </defs>
      <path d="M32 3 57 17.5v29L32 61 7 46.5v-29Z" fill="#0a1022" stroke={`url(#${gold})`} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M32 11 50 21.5v21L32 53 14 42.5v-21Z" fill="none" stroke={`url(#${gold})`} strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M21 20 43 44M43 20 21 44" stroke={`url(#${emerald})`} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M17.5 16.5 24 23M46.5 16.5 40 23" stroke={`url(#${gold})`} strokeWidth="4" strokeLinecap="round" />
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
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[60deg]" />
      {!collapsed && (
        <span className="font-display text-2xl leading-none font-black tracking-tight">
          <span className="text-gold-gradient">AXE</span>
          <span className="text-emerald-300 text-glow-green">dex</span>
        </span>
      )}
    </button>
  )
}
