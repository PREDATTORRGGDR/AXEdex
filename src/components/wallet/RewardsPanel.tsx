import { Check, Gift, LifeBuoy, Lock } from 'lucide-react'
import { motion } from 'motion/react'
import { sfx, haptic } from '../../audio/sfx'
import { useNow } from '../../hooks/useNow'
import { cn } from '../../lib/cn'
import { formatChips, formatDuration } from '../../lib/format'
import {
  BANKRUPT_AID,
  BANKRUPT_COOLDOWN_MS,
  BANKRUPT_THRESHOLD,
  DAILY_COOLDOWN_MS,
  DAILY_MAX_STREAK,
  dailyBonusAmount,
  getDailyStatus,
  getRefillStatus,
  useCasino,
} from '../../store/casino'
import { celebrate } from '../../store/fx'
import { toast } from '../../store/toasts'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

function onClaimed(amount: number, title: string) {
  if (amount <= 0) return
  sfx.play('cashout')
  haptic([20, 30, 20])
  celebrate('coins', 1.2)
  toast({ kind: 'bonus', title, message: 'Фішки зараховано на баланс.', amount, icon: 'money-bag' })
}

function CooldownBar({ remaining, total, tone = 'gold', className }: { remaining: number; total: number; tone?: 'gold' | 'cyan'; className?: string }) {
  const progress = 1 - Math.min(1, remaining / total)
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-white/[0.05]', className)}>
      <motion.div
        className={cn('h-full rounded-full', tone === 'gold' ? 'bg-gradient-to-r from-gold-500 to-gold-200' : 'bg-gradient-to-r from-sky-500 to-neon-cyan')}
        initial={false}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.6 }}
      />
    </div>
  )
}

export function DailyBonusCard({ compact }: { compact?: boolean }) {
  const now = useNow()
  const daily = useCasino((s) => s.daily)
  const claim = useCasino((s) => s.claimDailyBonus)
  const status = getDailyStatus(daily, now)
  // Days already banked in the current streak (0 if the streak has lapsed).
  const doneDays = status.available ? status.nextStreakDay - 1 : daily.streak

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-4">
      <div className="absolute inset-0 bg-[radial-gradient(80%_90%_at_100%_0%,rgba(212,165,67,0.16),transparent_65%)]" aria-hidden />
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent" aria-hidden />
      <div className="relative flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-400/10 ring-1 ring-gold-300/25">
          <Icon name="spiral-calendar" size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold text-white">Щоденний бонус</h3>
          <p className="text-xs leading-snug text-slate-400">
            Серія до {DAILY_MAX_STREAK} днів поспіль збільшує нагороду — до {formatChips(dailyBonusAmount(DAILY_MAX_STREAK))} фішок.
          </p>
        </div>
      </div>

      {!compact && (
        <ol className="relative mt-4 grid grid-cols-7 gap-1">
          {Array.from({ length: DAILY_MAX_STREAK }, (_, i) => {
            const day = i + 1
            const done = day <= doneDays
            const next = status.available && day === status.nextStreakDay
            return (
              <li
                key={day}
                className={cn(
                  'flex min-w-0 flex-col items-center gap-1 rounded-lg border px-0.5 py-2 text-center transition',
                  done && 'border-neon-emerald/30 bg-neon-emerald/[0.07]',
                  next && 'border-gold-300/70 bg-gold-400/10 shadow-[0_0_18px_-6px_rgba(230,194,106,0.8)]',
                  !done && !next && 'border-white/[0.05] bg-white/[0.02]',
                )}
              >
                <span className="text-[9px] font-bold tracking-wide text-slate-500 uppercase">Д{day}</span>
                {done ? (
                  <Check className="size-4 text-neon-emerald" />
                ) : (
                  <span className={cn('num text-[10.5px] font-bold', next ? 'text-gold-200' : 'text-slate-400')}>{formatChips(dailyBonusAmount(day))}</span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <div className="relative mt-4">
        {status.available ? (
          <Button variant="gold" size="lg" icon={Gift} sound={false} className="w-full" onClick={() => onClaimed(claim(), 'Щоденний бонус отримано')}>
            Забрати {formatChips(status.amount)}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 text-slate-400">
                <Lock className="size-3.5 shrink-0" /> <span className="truncate">Наступний бонус через</span>
              </span>
              <span className="num shrink-0 font-bold text-gold-200">{formatDuration(status.nextAt - now)}</span>
            </div>
            <CooldownBar remaining={status.nextAt - now} total={DAILY_COOLDOWN_MS} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Bankruptcy aid: only when completely broke, and only once per cooldown. */
export function RefillCard() {
  const now = useNow()
  const balance = useCasino((s) => s.balance)
  const openRounds = useCasino((s) => s.openRounds)
  const refillLastAt = useCasino((s) => s.refillLastAt)
  const claim = useCasino((s) => s.claimRefill)
  const status = getRefillStatus({ balance, openRounds, refillLastAt }, now)

  return (
    <div className={cn('glass relative overflow-hidden rounded-2xl p-4', status.available && 'shadow-[0_0_0_1px_rgba(34,225,255,0.35),0_0_32px_-10px_rgba(34,225,255,0.5)]')}>
      {status.available && <div className="absolute inset-0 bg-[radial-gradient(80%_90%_at_100%_0%,rgba(34,225,255,0.14),transparent_65%)]" aria-hidden />}
      <div className="relative flex items-center gap-3">
        <div className={cn('grid size-12 shrink-0 place-items-center rounded-xl ring-1', status.broke ? 'bg-neon-cyan/10 ring-neon-cyan/25' : 'bg-white/[0.03] ring-white/[0.06]')}>
          <Icon name="money-bag" size={28} glow={status.broke} className={cn(!status.broke && 'opacity-40 grayscale')} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold text-white">Допомога банку</h3>
          <p className="text-xs leading-snug text-slate-400">
            {status.broke
              ? `Фішки закінчилися. Банк видає ${formatChips(BANKRUPT_AID)} фішок не частіше ніж раз на 8 годин.`
              : `Лише якщо на балансі менше ${formatChips(BANKRUPT_THRESHOLD)} фішок: ${formatChips(BANKRUPT_AID)} фішок раз на 8 годин.`}
          </p>
        </div>
      </div>
      {status.available && (
        <Button variant="cyan" size="lg" icon={LifeBuoy} sound={false} className="relative mt-4 w-full" onClick={() => onClaimed(claim(), 'Допомогу отримано')}>
          Отримати {formatChips(status.amount)}
        </Button>
      )}
      {status.broke && !status.available && (
        <div className="relative mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-slate-400">
              <Lock className="size-3.5 shrink-0" /> <span className="truncate">Банк відкриється через</span>
            </span>
            <span className="num shrink-0 font-bold text-neon-cyan">{formatDuration(status.nextAt - now)}</span>
          </div>
          <CooldownBar remaining={status.nextAt - now} total={BANKRUPT_COOLDOWN_MS} tone="cyan" />
        </div>
      )}
    </div>
  )
}

/** Every source of free chips: the daily bonus and bankruptcy aid. */
export function RewardsPanel() {
  return (
    <div className="space-y-3">
      <DailyBonusCard />
      <RefillCard />
    </div>
  )
}
