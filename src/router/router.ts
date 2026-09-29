import { useSyncExternalStore } from 'react'
import { isGameId, type GameId } from '../games/ids'

/**
 * Minimal hash router. Hash URLs work on any static host (including sub-paths
 * such as GitHub Pages) with no server rewrites.
 */
export type Route =
  | { name: 'lobby' }
  | { name: 'profile' }
  | { name: 'game'; id: GameId }
  | { name: 'not-found'; path: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/'
  if (path === '/' || path === '/lobby') return { name: 'lobby' }
  if (path === '/profile') return { name: 'profile' }
  const game = path.match(/^\/play\/([a-z-]+)$/)
  if (game && isGameId(game[1])) return { name: 'game', id: game[1] }
  return { name: 'not-found', path }
}

export const paths = {
  lobby: '/',
  profile: '/profile',
  game: (id: GameId) => `/play/${id}`,
}

export function navigate(path: string) {
  if (window.location.hash.slice(1) !== path) window.location.hash = path
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

let cachedHash: string | null = null
let cachedRoute: Route = { name: 'lobby' }
const getSnapshot = (): Route => {
  const hash = window.location.hash
  if (hash !== cachedHash) {
    cachedHash = hash
    cachedRoute = parseRoute(hash)
  }
  return cachedRoute
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, () => cachedRoute)
}

export const routeKey = (r: Route) => (r.name === 'game' ? `game:${r.id}` : r.name)
