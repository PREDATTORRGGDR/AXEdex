import { motion, type HTMLMotionProps } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { forwardRef, type ReactNode } from 'react'
import { sfx, type SoundName } from '../../audio/sfx'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'gold' | 'emerald' | 'glass' | 'ghost' | 'danger' | 'violet' | 'cyan'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const variants: Record<ButtonVariant, string> = {
  gold: cn(
    'text-ink-950 font-bold',
    'bg-[linear-gradient(180deg,#fff0bd_0%,#fcd96b_30%,#e2ab1c_75%,#b98511_100%)]',
    'shadow-[0_0_0_1px_rgb(255_231_163/0.6)_inset,0_8px_24px_-8px_rgb(245_197_66/0.7),0_0_32px_-8px_rgb(245_197_66/0.6)]',
    'hover:brightness-110',
  ),
  emerald: cn(
    'text-ink-950 font-bold',
    'bg-[linear-gradient(180deg,#a7ffd9_0%,#34f5a0_35%,#10b981_80%,#047857_100%)]',
    'shadow-[0_0_0_1px_rgb(167_255_217/0.6)_inset,0_8px_24px_-8px_rgb(52_245_160/0.6),0_0_32px_-8px_rgb(52_245_160/0.5)]',
    'hover:brightness-110',
  ),
  violet: cn(
    'text-white font-bold',
    'bg-[linear-gradient(180deg,#c4b5fd_0%,#8b5cf6_45%,#6d28d9_100%)]',
    'shadow-[0_0_0_1px_rgb(196_181_253/0.5)_inset,0_8px_24px_-8px_rgb(139_92_246/0.7)]',
    'hover:brightness-110',
  ),
  cyan: cn(
    'text-ink-950 font-bold',
    'bg-[linear-gradient(180deg,#cffafe_0%,#22d3ee_45%,#0891b2_100%)]',
    'shadow-[0_0_0_1px_rgb(207_250_254/0.5)_inset,0_8px_24px_-8px_rgb(34_211_238/0.7)]',
    'hover:brightness-110',
  ),
  danger: cn(
    'text-white font-bold',
    'bg-[linear-gradient(180deg,#fda4af_0%,#f43f5e_45%,#be123c_100%)]',
    'shadow-[0_0_0_1px_rgb(253_164_175/0.5)_inset,0_8px_24px_-8px_rgb(244_63_94/0.7)]',
    'hover:brightness-110',
  ),
  glass: cn('glass text-slate-100 font-semibold hover:bg-white/10'),
  ghost: cn('text-slate-300 font-medium hover:bg-white/[0.06] hover:text-white'),
}

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-lg',
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-2xl',
  xl: 'h-14 px-8 text-lg gap-2.5 rounded-2xl tracking-wide',
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconRight?: LucideIcon
  /** Sound played on press; `false` to stay silent. */
  sound?: SoundName | false
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'glass', size = 'md', icon: Icon, iconRight: IconRight, sound = 'click', className, children, onClick, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96, y: 1 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      disabled={disabled}
      onClick={(e) => {
        if (sound) sfx.play(sound)
        onClick?.(e)
      }}
      className={cn(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap transition-[filter,background-color,color,opacity] duration-150',
        'disabled:opacity-40 disabled:saturate-50 disabled:hover:brightness-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className={size === 'xs' ? 'size-3.5' : size === 'sm' ? 'size-4' : 'size-5'} strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight className={size === 'xs' ? 'size-3.5' : 'size-4'} strokeWidth={2.2} />}
    </motion.button>
  )
})

export function IconButton({
  icon: Icon,
  label,
  className,
  active,
  ...rest
}: Omit<ButtonProps, 'children' | 'icon'> & { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant="ghost"
      className={cn('!px-0 aspect-square', active && 'bg-white/10 text-white', className)}
      {...rest}
    >
      <Icon className="size-5" strokeWidth={2} />
    </Button>
  )
}
