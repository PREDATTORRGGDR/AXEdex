import { useCallback, useEffect, useRef, useState } from 'react'
import { haptic, sfx } from '../audio/sfx'
import { celebrate } from '../store/fx'

export type ResultKind = 'win' | 'bigwin' | 'lose' | 'push' | 'info'

export interface GameResult {
  kind: ResultKind
  title: string
  /** Net or total amount to display (chips). */
  amount?: number
  multiplier?: number
  subtitle?: string
}

/**
 * Shows a result banner for a while, with matching sound, haptics and (for
 * big wins) a coin shower. Returns [result, show, clear].
 */
export function useResultBanner(defaultMs = 2600) {
  const [result, setResult] = useState<GameResult | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const clear = useCallback(() => {
    window.clearTimeout(timer.current)
    setResult(null)
  }, [])

  const show = useCallback(
    (r: GameResult, opts: { ms?: number; silent?: boolean } = {}) => {
      window.clearTimeout(timer.current)
      setResult(r)
      if (!opts.silent) {
        if (r.kind === 'bigwin') {
          sfx.play('bigWin')
          haptic([30, 40, 30, 40, 60])
          celebrate('coins', 2.5)
        } else if (r.kind === 'win') {
          sfx.play('win')
          haptic(25)
          if ((r.multiplier ?? 0) >= 5) celebrate('confetti', 1)
        } else if (r.kind === 'lose') {
          sfx.play('lose')
        } else if (r.kind === 'push') {
          sfx.play('push')
        }
      }
      timer.current = window.setTimeout(() => setResult(null), opts.ms ?? defaultMs)
    },
    [defaultMs],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return [result, show, clear] as const
}

/** Classifies a settled round into a banner kind. */
export function resultKind(wager: number, payout: number): ResultKind {
  if (payout > wager) return payout >= wager * 10 ? 'bigwin' : 'win'
  if (payout === wager) return 'push'
  return 'lose'
}
