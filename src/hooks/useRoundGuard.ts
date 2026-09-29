import { useEffect, useMemo, useRef } from 'react'
import { useCasino, type Settlement } from '../store/casino'

/**
 * Tracks rounds whose outcome is already decided while their animation plays.
 * If the component unmounts mid-animation (navigation), every tracked round is
 * settled immediately with its stored fallback, so no wager is ever lost.
 */
export function useRoundGuard() {
  const ids = useRef(new Set<string>())

  useEffect(() => {
    const tracked = ids.current
    return () => {
      for (const id of tracked) useCasino.getState().finishRound(id)
      tracked.clear()
    }
  }, [])

  return useMemo(
    () => ({
      track: (id: string) => {
        ids.current.add(id)
      },
      finish: (id: string, settlement?: Settlement) => {
        ids.current.delete(id)
        return useCasino.getState().finishRound(id, settlement)
      },
      forget: (id: string) => {
        ids.current.delete(id)
      },
    }),
    [],
  )
}
