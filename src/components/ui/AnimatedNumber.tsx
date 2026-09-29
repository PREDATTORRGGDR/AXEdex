import { animate } from 'motion/react'
import { useEffect, useRef } from 'react'
import { formatChips } from '../../lib/format'

interface AnimatedNumberProps {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}

/**
 * Counts smoothly towards `value`. Updates the DOM directly so a rolling
 * balance never re-renders React on every frame.
 */
export function AnimatedNumber({ value, format = formatChips, duration = 0.8, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const current = useRef(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const controls = animate(current.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        current.current = v
        el.textContent = format(v)
      },
    })
    return () => controls.stop()
  }, [value, duration, format])

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}
