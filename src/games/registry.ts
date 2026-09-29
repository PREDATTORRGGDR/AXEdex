import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { GameId } from './ids'

/** Each game is code-split into its own chunk and loaded on demand. */
export const GAME_COMPONENTS: Record<GameId, LazyExoticComponent<ComponentType>> = {
  roulette: lazy(() => import('./roulette/RouletteGame')),
  blackjack: lazy(() => import('./blackjack/BlackjackGame')),
  slots: lazy(() => import('./slots/SlotsGame')),
  crash: lazy(() => import('./crash/CrashGame')),
  plinko: lazy(() => import('./plinko/PlinkoGame')),
  mines: lazy(() => import('./mines/MinesGame')),
  dice: lazy(() => import('./dice/DiceGame')),
  wheel: lazy(() => import('./wheel/WheelGame')),
  poker: lazy(() => import('./poker/VideoPokerGame')),
  keno: lazy(() => import('./keno/KenoGame')),
  hilo: lazy(() => import('./hilo/HiLoGame')),
}
