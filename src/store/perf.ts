import { create } from 'zustand'
import { useCasino } from './casino'

export type Quality = 'auto' | 'high' | 'low'

interface PerfState {
  /** Set when the automatic probe decides this device needs lighter rendering. */
  autoLow: boolean
  measuredFps: number | null
  setAutoLow: (autoLow: boolean, fps?: number) => void
}

function weakHardware(): boolean {
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency ?? 8
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduced || (cores <= 4 && memory <= 4)
}

export const usePerf = create<PerfState>()((set) => ({
  autoLow: weakHardware(),
  measuredFps: null,
  setAutoLow: (autoLow, fps) => set({ autoLow, measuredFps: fps ?? null }),
}))

/**
 * Measures the real frame rate for two seconds shortly after start-up and
 * switches automatic quality to «economy» when the device cannot keep up.
 */
export function startFpsProbe(): void {
  if (typeof requestAnimationFrame === 'undefined') return
  window.setTimeout(() => {
    let frames = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      frames++
      if (t - start < 2000) {
        requestAnimationFrame(tick)
        return
      }
      if (document.hidden) return
      const fps = (frames * 1000) / (t - start)
      if (fps < 45) usePerf.getState().setAutoLow(true, Math.round(fps))
      else usePerf.setState({ measuredFps: Math.round(fps) })
    }
    requestAnimationFrame(tick)
  }, 1500)
}

/** True when rendering should favour speed over decoration. */
export function useEffectsLow(): boolean {
  const quality = useCasino((s) => s.settings.quality)
  const autoLow = usePerf((s) => s.autoLow)
  return quality === 'low' || (quality === 'auto' && autoLow)
}

export const effectsLowNow = () => {
  const quality = useCasino.getState().settings.quality
  return quality === 'low' || (quality === 'auto' && usePerf.getState().autoLow)
}
