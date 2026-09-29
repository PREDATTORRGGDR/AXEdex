import { useState } from 'react'
import { sfx } from '../../audio/sfx'
import { useCasino } from '../../store/casino'
import { cn } from '../../lib/cn'
import { formatChips } from '../../lib/format'
import { CasinoChip } from './CasinoChip'

interface BetInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  label?: string
  className?: string
}

/** Numeric bet field with ½ / 2× / max shortcuts, clamped to the balance. */
export function BetInput({ value, onChange, min = 1, max, disabled, label = 'Сума ставки', className }: BetInputProps) {
  const balance = useCasino((s) => s.balance)
  const ceiling = Math.max(min, Math.min(max ?? Infinity, balance))
  // Text being typed; null while the field simply mirrors `value`.
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (next: number) => {
    const clamped = Math.max(min, Math.min(Math.floor(next) || min, ceiling))
    onChange(clamped)
    setDraft(null)
  }

  const quick = (next: number) => {
    sfx.play('chip')
    commit(next)
  }

  const tooHigh = value > balance

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold tracking-[0.12em] text-slate-500 uppercase">
        <label htmlFor="bet-input" className="truncate">
          {label}
        </label>
        <span className={cn('num shrink-0 tracking-normal normal-case', tooHigh ? 'text-neon-red' : 'text-slate-400')}>
          {formatChips(balance)}
        </span>
      </div>
      <div
        className={cn(
          'well flex h-12 items-center gap-1 rounded-xl pr-1 pl-2.5 transition-[border-color,box-shadow]',
          tooHigh ? 'border-neon-red/60' : 'focus-within:border-neon-emerald/50 focus-within:shadow-[inset_0_2px_16px_rgba(0,0,0,0.65),0_0_0_3px_rgba(25,245,163,0.12)]',
          disabled && 'opacity-50',
        )}
      >
        <CasinoChip value={100} size={22} label="" className="shrink-0" />
        <input
          id="bet-input"
          inputMode="numeric"
          value={draft ?? String(value)}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={() => draft !== null && commit(Number(draft))}
          onKeyDown={(e) => e.key === 'Enter' && draft !== null && commit(Number(draft))}
          className="num w-full min-w-0 bg-transparent pl-1 text-base font-bold text-white outline-none"
          aria-label={label}
        />
        {(
          [
            ['½', 'Половина ставки', () => quick(value / 2)],
            ['2×', 'Подвоїти ставку', () => quick(value * 2)],
            ['Макс', 'Максимальна ставка', () => quick(ceiling)],
          ] as const
        ).map(([text, aria, fn]) => (
          <button
            key={text}
            type="button"
            disabled={disabled}
            onClick={fn}
            aria-label={aria}
            className="h-9 min-w-10 shrink-0 rounded-lg border border-white/[0.07] bg-[linear-gradient(180deg,#222a38,#1a212d)] px-2 text-xs font-bold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_0_#07090d] transition hover:border-neon-emerald/30 hover:text-white active:translate-y-px disabled:pointer-events-none"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
