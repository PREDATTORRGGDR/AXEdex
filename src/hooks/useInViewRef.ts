import { useEffect, useRef, type RefObject } from 'react'

/**
 * Tracks whether an element is on screen without re-rendering. Canvas loops
 * read `.current` each frame and skip work while their game is scrolled away.
 */
export function useInViewRef<T extends Element>(target: RefObject<T | null>) {
  const visible = useRef(true)
  useEffect(() => {
    const el = target.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting
    })
    io.observe(el)
    return () => io.disconnect()
  }, [target])
  return visible
}
