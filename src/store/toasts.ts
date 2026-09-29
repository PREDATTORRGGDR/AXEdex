import { create } from 'zustand'
import type { IconName } from '../components/ui/iconNames'
import { randomId } from '../lib/rng'

export type ToastKind = 'achievement' | 'level' | 'bonus' | 'info' | 'warning'

export interface Toast {
  id: string
  kind: ToastKind
  title: string
  message?: string
  /** Optional chip amount shown as a badge. */
  amount?: number
  icon?: IconName
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (toast) => {
    const id = randomId()
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id }] }))
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (t: Omit<Toast, 'id'>) => useToasts.getState().push(t)
