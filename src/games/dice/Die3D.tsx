import { motion, useAnimate } from 'motion/react'
import { useEffect } from 'react'
import { cn } from '../../lib/cn'

/** Pip layout on a 3×3 grid for each face value. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

/** Cube face placement; opposite faces sum to 7. */
const FACES: { value: number; transform: (h: number) => string }[] = [
  { value: 1, transform: (h) => `rotateY(0deg) translateZ(${h}px)` },
  { value: 6, transform: (h) => `rotateY(180deg) translateZ(${h}px)` },
  { value: 3, transform: (h) => `rotateY(90deg) translateZ(${h}px)` },
  { value: 4, transform: (h) => `rotateY(-90deg) translateZ(${h}px)` },
  { value: 2, transform: (h) => `rotateX(90deg) translateZ(${h}px)` },
  { value: 5, transform: (h) => `rotateX(-90deg) translateZ(${h}px)` },
]

/** Cube rotation that shows each value to the viewer. */
const SHOW: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  2: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
}

interface Die3DProps {
  value: number
  /** Changes on every throw to trigger a tumble. */
  rollId: number
  size?: number
  tone?: 'ivory' | 'ruby'
  delay?: number
}

export function Die3D({ value, rollId, size = 84, tone = 'ivory', delay = 0 }: Die3DProps) {
  const h = size / 2
  // Whole turns grow with every throw, so each roll tumbles forward instead of snapping back.
  const turns = { x: rollId * 720 + (rollId % 2) * 360, y: rollId * 720 }
  const target = SHOW[value]
  const [scope, animate] = useAnimate<HTMLDivElement>()

  // Hop on every throw (the cube keeps its rotation, so it is not remounted).
  useEffect(() => {
    if (!rollId || !scope.current) return
    void animate(scope.current, { y: [0, -size * 0.7, 0, -size * 0.18, 0] }, { duration: 1.1, times: [0, 0.35, 0.7, 0.85, 1], delay })
  }, [rollId, size, delay, animate, scope])

  return (
    <div ref={scope} className="[perspective:700px]" style={{ width: size, height: size }}>
      <motion.div
        className="relative size-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateX: turns.x + target.x, rotateY: turns.y + target.y }}
        transition={{ duration: 1.1, ease: [0.2, 0.7, 0.3, 1], delay }}
      >
        {FACES.map((f) => (
          <div
            key={f.value}
            className={cn(
              'absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-[18%] p-[14%] [backface-visibility:hidden]',
              tone === 'ivory'
                ? 'bg-[radial-gradient(circle_at_30%_25%,#ffffff,#e8e2d4)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),inset_0_-6px_12px_rgba(0,0,0,0.12)]'
                : 'bg-[radial-gradient(circle_at_30%_25%,#ff6b81,#b3122f)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15),inset_0_-6px_12px_rgba(0,0,0,0.25)]',
            )}
            style={{ transform: f.transform(h) }}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="grid place-items-center">
                {PIPS[f.value].includes(i) && (
                  <span
                    className={cn('block rounded-full', tone === 'ivory' ? 'bg-[#141824]' : 'bg-white')}
                    style={{ width: size * 0.15, height: size * 0.15, boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.35)' }}
                  />
                )}
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
