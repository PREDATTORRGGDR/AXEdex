import { createJSONStorage, type StateStorage } from 'zustand/middleware'

/**
 * localStorage with an in-memory fallback, so private browsing modes, blocked
 * storage and test environments never crash the app.
 */
const memory = new Map<string, string>()

const safeStorage: StateStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      memory.set(key, value)
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      memory.delete(key)
    }
  },
}

export const persistStorage = createJSONStorage(() => safeStorage)

export const STORAGE_PREFIX = 'axedex'
