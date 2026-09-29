import { Coins } from 'lucide-react'
import { useState } from 'react'
import { sfx } from '../../audio/sfx'
import { useCasino } from '../../store/casino'
import { cn } from '../../lib/cn'
import { formatChips } from '../../lib/format'

interface BetInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  label?: string
  className?: string
}

/** Numeric bet field with ½ / 2× / min / max shortcuts, clamped to the balance. */
export function BetInput({ value, onChange, min = 1, max, disabled, label = 'Сумма ставки', className }: BetInputProps) {
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
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs font-medium text-slate-400">
        <label htmlFor="bet-input">{label}</label>
        <span className={cn('tabular-nums', tooHigh && 'text-rose-400')}>
          Баланс {formatChips(balance)}
        </span>
      </div>
      <div
        className={cn(
          'flex h-12 items-center gap-1 rounded-xl border bg-ink-950/60 pr-1 pl-3 transition-colors',
          tooHigh ? 'border-rose-500/60' : 'border-white/10 focus-within:border-gold-400/60',
          disabled && 'opacity-50',
        )}
      >
        <Coins className="size-4 shrink-0 text-gold-400" />
        <input
          id="bet-input"
          inputMode="numeric"
          value={draft ?? String(value)}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={() => draft !== null && commit(Number(draft))}
          onKeyDown={(e) => e.key === 'Enter' && draft !== null && commit(Number(draft))}
          className="w-full min-w-0 bg-transparent text-base font-bold text-white tabular-nums outline-none"
          aria-label={label}
        />
        {(
          [
            ['½', () => quick(value / 2)],
            ['2×', () => quick(value * 2)],
            ['Макс', () => quick(ceiling)],
          ] as const
        ).map(([text, fn]) => (
          <button
            key={text}
            type="button"
            disabled={disabled}
            onClick={fn}
            className="h-9 min-w-10 rounded-lg bg-white/[0.06] px-2 text-xs font-bold text-slate-200 transition hover:bg-white/[0.12] active:scale-95 disabled:pointer-events-none"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
