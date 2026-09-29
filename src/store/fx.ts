import { create } from 'zustand'

export type CelebrationKind = 'coins' | 'confetti'

export interface Celebration {
  id: number
  kind: CelebrationKind
  /** 1 = regular win, 3 = huge win. */
  intensity: number
}

interface FxState {
  celebration: Celebration | null
  celebrate: (kind?: CelebrationKind, intensity?: number) => void
}

let seq = 0

/** Global visual-effects bus, so any game can trigger a full-screen celebration. */
export const useFx = create<FxState>()((set) => ({
  celebration: null,
  celebrate: (kind = 'coins', intensity = 1) => set({ celebration: { id: ++seq, kind, intensity } }),
}))

export const celebrate = (kind?: CelebrationKind, intensity?: number) => useFx.getState().celebrate(kind, intensity)
