import { motion } from 'motion/react'
import { cardName, isRed, RANK_LABEL, SUIT_SYMBOL, type Card } from '../../lib/cards'
import { cn } from '../../lib/cn'

export type CardSize = 'sm' | 'md' | 'lg'

const SIZES: Record<CardSize, { box: string; corner: string; pip: string }> = {
  sm: { box: 'w-12 h-[68px] rounded-md', corner: 'text-[11px]', pip: 'text-2xl' },
  md: { box: 'w-[62px] h-[88px] sm:w-[72px] sm:h-[102px] rounded-lg', corner: 'text-sm sm:text-base', pip: 'text-3xl sm:text-4xl' },
  lg: { box: 'w-[56px] h-[80px] min-[400px]:w-[64px] min-[400px]:h-[92px] sm:w-[92px] sm:h-[130px] rounded-lg sm:rounded-xl', corner: 'text-[13px] min-[400px]:text-sm sm:text-lg', pip: 'text-2xl min-[400px]:text-3xl sm:text-5xl' },
}

export function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative size-full overflow-hidden rounded-[inherit] border border-gold-300/35 bg-[linear-gradient(150deg,#1a212d,#07090d)] shadow-[inset_0_0_0_3px_rgba(7,9,13,1),inset_0_0_0_4px_rgba(230,194,106,0.3)]',
        className,
      )}
    >
      <div className="absolute inset-[6px] rounded-[inherit] bg-[repeating-linear-gradient(45deg,rgba(230,194,106,0.1)_0_1px,transparent_1px_7px),repeating-linear-gradient(-45deg,rgba(25,245,163,0.09)_0_1px,transparent_1px_7px)]" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid size-7 rotate-45 place-items-center rounded-md border border-gold-300/40 bg-ink-950/80 shadow-[0_0_12px_-2px_rgba(25,245,163,0.5)]">
          <span className="-rotate-45 font-display text-[13px] font-black text-emerald-gradient">X</span>
        </span>
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
      aria-label={showBack ? 'Закрита карта' : cardName(card!)}
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
            highlight === 'green' && 'ring-2 ring-neon-emerald shadow-glow-green',
            highlight === 'red' && 'ring-2 ring-neon-red',
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
