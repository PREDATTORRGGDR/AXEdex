import { motion } from 'motion/react'
import { cardName, isRed, RANK_LABEL, SUIT_SYMBOL, type Card } from '../../lib/cards'
import { cn } from '../../lib/cn'

export type CardSize = 'sm' | 'md' | 'lg'

const SIZES: Record<CardSize, { box: string; corner: string; pip: string }> = {
  sm: { box: 'w-12 h-[68px] rounded-md', corner: 'text-[11px]', pip: 'text-2xl' },
  md: { box: 'w-[62px] h-[88px] sm:w-[72px] sm:h-[102px] rounded-lg', corner: 'text-sm sm:text-base', pip: 'text-3xl sm:text-4xl' },
  lg: { box: 'w-[64px] h-[92px] sm:w-[92px] sm:h-[130px] rounded-xl', corner: 'text-sm sm:text-lg', pip: 'text-3xl sm:text-5xl' },
}

export function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative size-full overflow-hidden rounded-[inherit] border border-gold-300/40 bg-[linear-gradient(135deg,#101a3d,#070b18)] shadow-[inset_0_0_0_3px_rgba(7,11,24,1),inset_0_0_0_4px_rgba(252,217,107,0.35)]',
        className,
      )}
    >
      <div className="absolute inset-[6px] rounded-[inherit] bg-[repeating-linear-gradient(45deg,rgba(252,217,107,0.12)_0_2px,transparent_2px_8px),repeating-linear-gradient(-45deg,rgba(52,245,160,0.1)_0_2px,transparent_2px_8px)]" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-lg font-black text-gold-300/80 drop-shadow-[0_0_8px_rgba(252,217,107,0.6)]">X</span>
      </div>
    </div>
  )
}

function CardFace({ card, size }: { card: Card; size: CardSize }) {
  const red = isRed(card.suit)
  const s = SIZES[size]
  const label = RANK_LABEL[card.rank]
  const suit = SUIT_SYMBOL[card.suit]
  return (
    <div
      className={cn(
        'relative size-full overflow-hidden rounded-[inherit] border border-black/10 bg-[linear-gradient(160deg,#ffffff,#f1ede4)]',
        red ? 'text-[#d11a3a]' : 'text-[#0f172a]',
      )}
    >
      <div className={cn('absolute top-1 left-1.5 flex flex-col items-center leading-none font-black', s.corner)}>
        <span>{label}</span>
        <span className="-mt-0.5">{suit}</span>
      </div>
      <div className={cn('absolute right-1.5 bottom-1 flex rotate-180 flex-col items-center leading-none font-black', s.corner)}>
        <span>{label}</span>
        <span className="-mt-0.5">{suit}</span>
      </div>
      <div className={cn('absolute inset-0 grid place-items-center', s.pip)}>
        {card.rank >= 11 && card.rank <= 13 ? (
          <span className="grid place-items-center rounded-md border-2 border-current/30 px-1.5 py-1 font-display leading-none font-black">
            {label}
            <span className="text-[0.55em]">{suit}</span>
          </span>
        ) : (
          <span className="drop-shadow-sm">{suit}</span>
        )}
      </div>
    </div>
  )
}

interface PlayingCardProps {
  card: Card | null
  faceDown?: boolean
  size?: CardSize
  className?: string
  /** Stagger for deal animation (seconds). */
  delay?: number
  /** Offset the card flies in from (deal animation). */
  from?: { x: number; y: number }
  highlight?: 'gold' | 'green' | 'red' | null
  dimmed?: boolean
}

/** A playing card with a 3D flip between back and face. */
export function PlayingCard({ card, faceDown, size = 'md', className, delay = 0, from, highlight, dimmed }: PlayingCardProps) {
  const showBack = faceDown || !card
  return (
    <motion.div
      initial={from ? { x: from.x, y: from.y, rotate: -25, opacity: 0, scale: 0.8 } : false}
      animate={{ x: 0, y: 0, rotate: 0, opacity: dimmed ? 0.45 : 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay }}
      className={cn('relative shrink-0 [perspective:800px]', SIZES[size].box, className)}
      aria-label={showBack ? 'Закрытая карта' : cardName(card!)}
      role="img"
    >
      <motion.div
        className="relative size-full rounded-[inherit] [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: showBack ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className={cn(
            'absolute inset-0 rounded-[inherit] shadow-[0_8px_18px_-6px_rgba(0,0,0,0.7)] [backface-visibility:hidden]',
            highlight === 'gold' && 'ring-2 ring-gold-300 shadow-glow-gold',
            highlight === 'green' && 'ring-2 ring-emerald-300 shadow-glow-green',
            highlight === 'red' && 'ring-2 ring-rose-400',
          )}
        >
          {card && <CardFace card={card} size={size} />}
        </div>
        <div className="absolute inset-0 rounded-[inherit] shadow-[0_8px_18px_-6px_rgba(0,0,0,0.7)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CardBack />
        </div>
      </motion.div>
    </motion.div>
  )
}
