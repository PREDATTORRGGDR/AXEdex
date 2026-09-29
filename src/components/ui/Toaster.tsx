import { Award, Gift, Info, Star, TriangleAlert, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { sfx, type SoundName } from '../../audio/sfx'
import { cn } from '../../lib/cn'
import { formatChips } from '../../lib/format'
import { useToasts, type Toast, type ToastKind } from '../../store/toasts'
import { Icon as GlyphIcon } from './Icon'

const KIND: Record<ToastKind, { icon: LucideIcon; accent: string; iconClass: string; bar: string; label: string; sound: SoundName }> = {
  achievement: {
    icon: Award,
    accent: 'shadow-[0_0_0_1px_rgb(230_194_106/0.35),0_24px_48px_-16px_rgb(0_0_0/0.9),0_0_40px_-12px_rgb(230_194_106/0.5)]',
    iconClass: 'bg-gold-400/10 text-gold-300 ring-gold-300/25',
    bar: 'from-gold-200 via-gold-400',
    label: 'Досягнення відкрито',
    sound: 'achievement',
  },
  level: {
    icon: Star,
    accent: 'shadow-[0_0_0_1px_rgb(157_123_255/0.35),0_24px_48px_-16px_rgb(0_0_0/0.9),0_0_40px_-12px_rgb(157_123_255/0.5)]',
    iconClass: 'bg-neon-violet/10 text-neon-violet ring-neon-violet/25',
    bar: 'from-neon-violet via-neon-violet/70',
    label: 'Новий рівень',
    sound: 'levelUp',
  },
  bonus: {
    icon: Gift,
    accent: 'shadow-[0_0_0_1px_rgb(25_245_163/0.3),0_24px_48px_-16px_rgb(0_0_0/0.9),0_0_40px_-12px_rgb(25_245_163/0.45)]',
    iconClass: 'bg-neon-emerald/10 text-neon-emerald ring-neon-emerald/25',
    bar: 'from-neon-emerald via-neon-emerald/70',
    label: 'Бонус',
    sound: 'bonus',
  },
  info: {
    icon: Info,
    accent: 'shadow-[0_0_0_1px_rgb(34_225_255/0.28),0_24px_48px_-16px_rgb(0_0_0/0.9)]',
    iconClass: 'bg-neon-cyan/10 text-neon-cyan ring-neon-cyan/25',
    bar: 'from-neon-cyan via-neon-cyan/70',
    label: 'Повідомлення',
    sound: 'ping',
  },
  warning: {
    icon: TriangleAlert,
    accent: 'shadow-[0_0_0_1px_rgb(255_77_109/0.35),0_24px_48px_-16px_rgb(0_0_0/0.9)]',
    iconClass: 'bg-neon-red/10 text-neon-red ring-neon-red/25',
    bar: 'from-neon-red via-neon-red/70',
    label: 'Увага',
    sound: 'error',
  },
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss)
  const k = KIND[toast.kind]
  const Icon = k.icon

  useEffect(() => {
    sfx.play(k.sound)
    const id = window.setTimeout(() => dismiss(toast.id), 5200)
    return () => window.clearTimeout(id)
  }, [toast.id, dismiss, k.sound])

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.94, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className={cn('glass-strong pointer-events-auto relative w-full cursor-pointer overflow-hidden rounded-2xl p-3 pr-3.5', k.accent)}
      onClick={() => dismiss(toast.id)}
      role="status"
    >
      <motion.div
        className={cn('absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r to-transparent', k.bar)}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5.2, ease: 'linear' }}
      />
      <div className="flex items-center gap-3">
        <div className={cn('grid size-11 shrink-0 place-items-center rounded-xl ring-1', k.iconClass)}>
          {toast.icon ? <GlyphIcon name={toast.icon} size={28} /> : <Icon className="size-5" strokeWidth={2.2} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{k.label}</p>
          <p className="truncate font-display text-sm font-bold text-white">{toast.title}</p>
          {toast.message && <p className="mt-0.5 text-xs leading-snug text-slate-400">{toast.message}</p>}
        </div>
        {!!toast.amount && (
          <span className="num shrink-0 rounded-lg bg-neon-emerald/10 px-2 py-1 text-xs font-bold text-neon-emerald ring-1 ring-neon-emerald/25">
            +{formatChips(toast.amount)}
          </span>
        )}
      </div>
    </motion.li>
  )
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-[4.25rem] z-[90] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:top-20 sm:w-[380px]"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </ol>
  )
}
