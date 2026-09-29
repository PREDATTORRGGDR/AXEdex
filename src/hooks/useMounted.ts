import { useEffect, useRef } from 'react'

/** Ref that is true while the component is mounted, for guarding async flows. */
export function useMountedRef() {
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return mounted
}
