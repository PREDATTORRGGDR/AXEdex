import { Award, Gift, Info, Star, TriangleAlert, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { sfx, type SoundName } from '../../audio/sfx'
import { cn } from '../../lib/cn'
import { formatChips } from '../../lib/format'
import { useToasts, type Toast, type ToastKind } from '../../store/toasts'
import { Icon as ColorIcon } from './Icon'

const KIND: Record<ToastKind, { icon: LucideIcon; ring: string; iconClass: string; label: string; sound: SoundName }> = {
  achievement: {
    icon: Award,
    ring: 'shadow-[0_0_0_1px_rgb(245_197_66/0.45),0_20px_40px_-12px_rgb(0_0_0/0.8),0_0_40px_-10px_rgb(245_197_66/0.5)]',
    iconClass: 'bg-gold-400/15 text-gold-300',
    label: 'Достижение открыто',
    sound: 'achievement',
  },
  level: {
    icon: Star,
    ring: 'shadow-[0_0_0_1px_rgb(167_139_250/0.45),0_20px_40px_-12px_rgb(0_0_0/0.8),0_0_40px_-10px_rgb(167_139_250/0.5)]',
    iconClass: 'bg-violet-400/15 text-violet-300',
    label: 'Новый уровень',
    sound: 'levelUp',
  },
  bonus: {
    icon: Gift,
    ring: 'shadow-[0_0_0_1px_rgb(52_245_160/0.4),0_20px_40px_-12px_rgb(0_0_0/0.8),0_0_40px_-10px_rgb(52_245_160/0.45)]',
    iconClass: 'bg-emerald-400/15 text-emerald-300',
    label: 'Бонус',
    sound: 'bonus',
  },
  info: {
    icon: Info,
    ring: 'shadow-[0_0_0_1px_rgb(34_211_238/0.35),0_20px_40px_-12px_rgb(0_0_0/0.8)]',
    iconClass: 'bg-cyan-400/15 text-cyan-300',
    label: 'Сообщение',
    sound: 'ping',
  },
  warning: {
    icon: TriangleAlert,
    ring: 'shadow-[0_0_0_1px_rgb(251_113_133/0.4),0_20px_40px_-12px_rgb(0_0_0/0.8)]',
    iconClass: 'bg-rose-400/15 text-rose-300',
    label: 'Внимание',
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
      initial={{ opacity: 0, y: -24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className={cn('glass-strong pointer-events-auto relative w-full overflow-hidden rounded-2xl p-3.5 pr-4', k.ring)}
      onClick={() => dismiss(toast.id)}
      role="status"
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-gold-300 via-gold-500 to-transparent"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5.2, ease: 'linear' }}
      />
      <div className="flex items-start gap-3">
        <div className={cn('grid size-11 shrink-0 place-items-center rounded-xl', k.iconClass)}>
          {toast.icon ? <ColorIcon name={toast.icon} size={30} /> : <Icon className="size-6" strokeWidth={2} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">{k.label}</p>
          <p className="truncate font-display text-sm font-bold text-white">{toast.title}</p>
          {toast.message && <p className="mt-0.5 text-xs leading-snug text-slate-300">{toast.message}</p>}
        </div>
        {!!toast.amount && (
          <span className="shrink-0 self-center rounded-lg bg-emerald-400/15 px-2 py-1 text-xs font-bold text-emerald-300 tabular-nums">
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
      className="pointer-events-none fixed inset-x-3 top-[4.5rem] z-[90] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:w-[380px]"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </ol>
  )
}
