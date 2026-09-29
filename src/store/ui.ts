import { create } from 'zustand'

interface UiState {
  rewardsOpen: boolean
  gamesOpen: boolean
  setRewardsOpen: (open: boolean) => void
  setGamesOpen: (open: boolean) => void
}

/** Ephemeral UI state (drawers, sheets). Not persisted. */
export const useUi = create<UiState>()((set) => ({
  rewardsOpen: false,
  gamesOpen: false,
  setRewardsOpen: (rewardsOpen) => set({ rewardsOpen }),
  setGamesOpen: (gamesOpen) => set({ gamesOpen }),
}))
