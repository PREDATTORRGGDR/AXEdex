import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  className?: string
  /** Renders as a bottom sheet on small screens. */
  sheet?: boolean
}

export function Modal({ open, onClose, title, children, className, sheet = true }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn('fixed inset-0 z-[80] flex justify-center sm:items-center sm:p-6', sheet ? 'items-end' : 'items-center p-4')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="backdrop-glass absolute inset-0 bg-ink-950/75" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            className={cn(
              'glass-strong relative max-h-[88dvh] w-full overflow-y-auto overscroll-contain sm:max-w-lg',
              sheet ? 'rounded-t-3xl sm:rounded-3xl' : 'rounded-3xl',
              className,
            )}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-neon-emerald/60 to-transparent" aria-hidden />
            {sheet && <span className="mx-auto mt-2 block h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden />}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-ink-900/85 px-5 py-3.5">
              <h2 className="min-w-0 truncate font-display text-lg font-bold tracking-wide text-white">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрити"
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 transition hover:border-white/15 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5 safe-bottom">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
