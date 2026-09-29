import { cn } from '../../lib/cn'

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
}

/** Small flat die face (1–6) drawn in SVG, so it renders identically on every device. */
export function DieFace({ value, size = 22, className }: { value: number; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('shrink-0', className)} aria-hidden>
      <rect x="4" y="4" width="92" height="92" rx="20" fill="#fdfcf7" stroke="#0f172a" strokeOpacity="0.25" strokeWidth="4" />
      {PIPS[value].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" fill={value === 1 ? '#dc2626' : '#111827'} />
      ))}
    </svg>
  )
}
