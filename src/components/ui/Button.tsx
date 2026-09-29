import { motion, type HTMLMotionProps } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { forwardRef, type ReactNode } from 'react'
import { sfx, type SoundName } from '../../audio/sfx'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'gold' | 'emerald' | 'glass' | 'ghost' | 'danger' | 'violet' | 'cyan'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/*
 * Tactile "heavy" buttons: a lit top bevel, a darker base edge that reads as
 * thickness, and a coloured glow. Pressing drops the face onto its edge.
 */
const SOLID = 'font-bold tracking-[0.01em] [text-shadow:0_1px_0_rgba(255,255,255,0.25)]'

const variants: Record<ButtonVariant, string> = {
  emerald: cn(
    SOLID,
    'text-[#03140d] bg-[linear-gradient(180deg,#6dffc9_0%,#19f5a3_38%,#0bcf86_72%,#079e67_100%)]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-3px_0_rgba(0,70,45,0.45),0_4px_0_#05603f,0_10px_28px_-8px_rgba(25,245,163,0.55)]',
    'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-3px_0_rgba(0,70,45,0.45),0_4px_0_#05603f,0_12px_36px_-6px_rgba(25,245,163,0.8)]',
  ),
  gold: cn(
    SOLID,
    'text-[#1b1204] bg-[linear-gradient(180deg,#fff0c2_0%,#f3cf6e_36%,#d9a73e_72%,#a8761d_100%)]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-3px_0_rgba(90,55,5,0.45),0_4px_0_#6e4a0e,0_10px_28px_-8px_rgba(230,194,106,0.55)]',
    'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-3px_0_rgba(90,55,5,0.45),0_4px_0_#6e4a0e,0_12px_36px_-6px_rgba(230,194,106,0.8)]',
  ),
  cyan: cn(
    SOLID,
    'text-[#021217] bg-[linear-gradient(180deg,#b3f6ff_0%,#22e1ff_40%,#0aaecf_75%,#0a7fa0_100%)]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-3px_0_rgba(0,50,70,0.45),0_4px_0_#07556b,0_10px_28px_-8px_rgba(34,225,255,0.55)]',
    'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-3px_0_rgba(0,50,70,0.45),0_4px_0_#07556b,0_12px_36px_-6px_rgba(34,225,255,0.8)]',
  ),
  violet: cn(
    'font-bold text-white [text-shadow:0_1px_0_rgba(0,0,0,0.25)]',
    'bg-[linear-gradient(180deg,#c9b8ff_0%,#9d7bff_38%,#7446f0_75%,#5429c2_100%)]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-3px_0_rgba(40,10,90,0.45),0_4px_0_#3a1a8a,0_10px_28px_-8px_rgba(157,123,255,0.55)]',
  ),
  danger: cn(
    'font-bold text-white [text-shadow:0_1px_0_rgba(0,0,0,0.25)]',
    'bg-[linear-gradient(180deg,#ff9aab_0%,#ff4d6d_40%,#e0254a_75%,#a8112f_100%)]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-3px_0_rgba(90,5,20,0.45),0_4px_0_#7a0d23,0_10px_28px_-8px_rgba(255,77,109,0.55)]',
  ),
  glass: cn(
    'font-semibold text-slate-200 bg-[linear-gradient(180deg,#222a38,#1a212d)] border border-white/[0.07]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_3px_0_#0b0f16,0_8px_20px_-12px_rgba(0,0,0,0.9)]',
    'hover:border-neon-emerald/25 hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_#0b0f16,0_0_22px_-8px_rgba(25,245,163,0.45)]',
  ),
  ghost: 'font-semibold text-slate-400 hover:bg-white/[0.05] hover:text-white',
}

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-md',
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
  xl: 'h-14 px-7 text-base gap-2.5 rounded-2xl uppercase tracking-[0.06em] font-display',
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
  const solid = variant !== 'ghost'
  return (
    <motion.button
      ref={ref}
      type="button"
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled || !solid ? undefined : { y: 3, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 0 rgba(0,0,0,0.6)' }}
      transition={{ type: 'spring', stiffness: 700, damping: 32 }}
      disabled={disabled}
      onClick={(e) => {
        if (sound) sfx.play(sound)
        onClick?.(e)
      }}
      className={cn(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap transition-[filter,box-shadow,background-color,color,border-color,opacity] duration-200',
        'disabled:opacity-40 disabled:saturate-[0.35]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className={cn('shrink-0', size === 'xs' ? 'size-3.5' : size === 'sm' ? 'size-4' : 'size-[18px]')} strokeWidth={2.4} />}
      {children}
      {IconRight && <IconRight className={cn('shrink-0', size === 'xs' ? 'size-3.5' : 'size-4')} strokeWidth={2.4} />}
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
    <Button aria-label={label} title={label} variant="ghost" className={cn('aspect-square !px-0', active && 'bg-white/10 text-white', className)} {...rest}>
      <Icon className="size-5" strokeWidth={2} />
    </Button>
  )
}
