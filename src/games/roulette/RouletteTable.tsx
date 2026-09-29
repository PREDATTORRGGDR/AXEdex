import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { CasinoChip } from '../../components/ui/CasinoChip'
import { cn } from '../../lib/cn'
import { chipLabel } from '../../lib/chips'
import { betName, colorOf, numbersFor, OUTSIDE_LABELS, straight, type BetKey, type Bets, type OutsideBet } from './logic'

interface RouletteTableProps {
  bets: Bets
  onBet: (key: BetKey) => void
  onRemove: (key: BetKey) => void
  disabled?: boolean
  vertical?: boolean
  /** Winning number + winning bets to highlight after a spin. */
  result?: { number: number; winning: BetKey[] } | null
}

interface CellProps {
  betKey: BetKey
  label: React.ReactNode
  className?: string
  style?: React.CSSProperties
  tone?: 'red' | 'black' | 'green' | 'felt'
  props: RouletteTableProps
  hovered: BetKey | null
  setHovered: (k: BetKey | null) => void
  vertical?: boolean
}

function Cell({ betKey, label, className, style, tone = 'felt', props, hovered, setHovered, vertical }: CellProps) {
  const amount = props.bets[betKey] ?? 0
  const covered = hovered ? numbersFor(hovered) : []
  const isNumber = betKey.startsWith('n')
  const n = isNumber ? Number(betKey.slice(1)) : -1
  const lit = isNumber && covered.includes(n)
  const isWinningNumber = props.result && isNumber && props.result.number === n
  const isWinningBet = props.result?.winning.includes(betKey)
  const dimmed = props.result && !isWinningBet && !isWinningNumber

  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => props.onBet(betKey)}
      onContextMenu={(e) => {
        e.preventDefault()
        props.onRemove(betKey)
      }}
      onPointerEnter={() => setHovered(betKey)}
      onPointerLeave={() => setHovered(null)}
      aria-label={`Ставка: ${betName(betKey)}${amount ? `, на столе ${amount}` : ''}`}
      style={style}
      className={cn(
        'relative flex items-center justify-center border border-gold-200/15 font-bold text-white transition-[background-color,box-shadow,opacity,filter] duration-200 select-none',
        'disabled:cursor-default',
        tone === 'red' && 'bg-roulette-red/85 hover:bg-roulette-red',
        tone === 'black' && 'bg-roulette-black/90 hover:bg-[#232838]',
        tone === 'green' && 'bg-roulette-green/85 hover:bg-roulette-green',
        tone === 'felt' && 'bg-white/[0.03] hover:bg-white/[0.09]',
        lit && 'shadow-[inset_0_0_0_2px_rgba(252,217,107,0.9)] brightness-125',
        isWinningNumber && 'z-10 animate-pulse shadow-[0_0_0_2px_#fcd96b,0_0_24px_4px_rgba(252,217,107,0.8)] brightness-150',
        isWinningBet && !isNumber && 'shadow-[inset_0_0_0_2px_rgba(52,245,160,0.9),0_0_18px_rgba(52,245,160,0.5)]',
        dimmed && 'opacity-45',
        vertical ? 'text-xs' : 'text-xs sm:text-sm',
        className,
      )}
    >
      <span className={cn(!isNumber && 'text-[10px] font-semibold tracking-wide text-gold-100/90 uppercase sm:text-xs')}>{label}</span>
      <AnimatePresence>
        {amount > 0 && (
          <motion.span
            key="chip"
            initial={{ scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
            className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
          >
            <motion.span key={amount} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="relative">
              <CasinoChip value={amount} size={vertical ? 26 : 30} label={chipLabel(amount)} />
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

const OUTSIDE_ROW: OutsideBet[] = ['low', 'even', 'red', 'black', 'odd', 'high']

/** Full European layout. Horizontal on wide screens, vertical on phones. */
export function RouletteTable(props: RouletteTableProps) {
  const [hovered, setHovered] = useState<BetKey | null>(null)
  const { vertical } = props
  const shared = { props, hovered, setHovered, vertical }

  const outsideTone = (k: OutsideBet) => (k === 'red' ? 'red' : k === 'black' ? 'black' : 'felt')
  const outsideLabel = (k: OutsideBet) =>
    k === 'red' ? <span className="block size-4 rotate-45 rounded-sm bg-roulette-red ring-1 ring-white/40" aria-hidden /> : k === 'black' ? <span className="block size-4 rotate-45 rounded-sm bg-roulette-black ring-1 ring-white/40" aria-hidden /> : OUTSIDE_LABELS[k]

  if (vertical) {
    return (
      <div
        className="felt grid overflow-hidden rounded-2xl border-2 border-gold-400/30 p-1.5"
        style={{ gridTemplateColumns: '0.85fr 0.85fr 1fr 1fr 1fr', gridTemplateRows: 'repeat(14, minmax(30px, 1fr))' }}
      >
        <Cell {...shared} betKey={straight(0)} label="0" tone="green" className="rounded-t-xl" style={{ gridColumn: '3 / 6', gridRow: 1 }} />
        {Array.from({ length: 36 }, (_, i) => {
          const n = i + 1
          return (
            <Cell
              key={n}
              {...shared}
              betKey={straight(n)}
              label={n}
              tone={colorOf(n) === 'red' ? 'red' : 'black'}
              style={{ gridColumn: 3 + ((n - 1) % 3), gridRow: Math.ceil(n / 3) + 1 }}
            />
          )
        })}
        {(['col1', 'col2', 'col3'] as const).map((k, i) => (
          <Cell key={k} {...shared} betKey={k} label="2 к 1" style={{ gridColumn: 3 + i, gridRow: 14 }} />
        ))}
        {(['dozen1', 'dozen2', 'dozen3'] as const).map((k, i) => (
          <Cell
            key={k}
            {...shared}
            betKey={k}
            label={<span className="[writing-mode:vertical-rl]">{OUTSIDE_LABELS[k]}</span>}
            style={{ gridColumn: 2, gridRow: `${2 + i * 4} / span 4` }}
          />
        ))}
        {OUTSIDE_ROW.map((k, i) => (
          <Cell
            key={k}
            {...shared}
            betKey={k}
            tone={outsideTone(k)}
            label={k === 'red' || k === 'black' ? outsideLabel(k) : <span className="[writing-mode:vertical-rl]">{OUTSIDE_LABELS[k]}</span>}
            style={{ gridColumn: 1, gridRow: `${2 + i * 2} / span 2` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="felt grid overflow-hidden rounded-2xl border-2 border-gold-400/30 p-2"
      style={{ gridTemplateColumns: '1.1fr repeat(12, 1fr) 1.15fr', gridTemplateRows: 'repeat(3, 52px) 44px 44px' }}
    >
      <Cell {...shared} betKey={straight(0)} label="0" tone="green" className="rounded-l-xl text-lg" style={{ gridColumn: 1, gridRow: '1 / 4' }} />
      {Array.from({ length: 36 }, (_, i) => {
        const n = i + 1
        return (
          <Cell
            key={n}
            {...shared}
            betKey={straight(n)}
            label={n}
            tone={colorOf(n) === 'red' ? 'red' : 'black'}
            style={{ gridColumn: Math.ceil(n / 3) + 1, gridRow: 3 - ((n - 1) % 3) }}
          />
        )
      })}
      {(['col3', 'col2', 'col1'] as const).map((k, i) => (
        <Cell key={k} {...shared} betKey={k} label="2 к 1" style={{ gridColumn: 14, gridRow: i + 1 }} />
      ))}
      {(['dozen1', 'dozen2', 'dozen3'] as const).map((k, i) => (
        <Cell key={k} {...shared} betKey={k} label={OUTSIDE_LABELS[k]} style={{ gridColumn: `${2 + i * 4} / span 4`, gridRow: 4 }} />
      ))}
      {OUTSIDE_ROW.map((k, i) => (
        <Cell key={k} {...shared} betKey={k} tone={outsideTone(k)} label={outsideLabel(k)} style={{ gridColumn: `${2 + i * 2} / span 2`, gridRow: 5 }} />
      ))}
    </div>
  )
}
