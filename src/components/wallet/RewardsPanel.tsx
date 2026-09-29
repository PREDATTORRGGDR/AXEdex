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
  toast({ kind: 'bonus', title, message: 'Фишки зачислены на баланс.', amount, icon: 'money-bag' })
}

function CooldownBar({ remaining, total, className }: { remaining: number; total: number; className?: string }) {
  const progress = 1 - Math.min(1, remaining / total)
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-white/[0.06]', className)}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-gold-300"
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
    <div className="relative overflow-hidden rounded-2xl border border-gold-400/25 bg-[linear-gradient(135deg,rgba(245,197,66,0.14),rgba(7,11,24,0.6)_60%)] p-4">
      <div className="absolute -top-10 -right-10 size-36 rounded-full bg-gold-400/20 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-400/15">
          <Icon name="spiral-calendar" size={32} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-bold text-white">Ежедневный бонус</h3>
          <p className="text-xs text-slate-400">
            Заходите каждый день: серия до {DAILY_MAX_STREAK} дней увеличивает награду.
          </p>
        </div>
      </div>

      {!compact && (
        <ol className="relative mt-4 grid grid-cols-7 gap-1.5">
          {Array.from({ length: DAILY_MAX_STREAK }, (_, i) => {
            const day = i + 1
            const done = day <= doneDays
            const next = status.available && day === status.nextStreakDay
            return (
              <li
                key={day}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border px-0.5 py-2 text-center transition',
                  done && 'border-emerald-400/40 bg-emerald-400/10',
                  next && 'border-gold-300/70 bg-gold-400/15 shadow-glow-gold',
                  !done && !next && 'border-white/5 bg-white/[0.03]',
                )}
              >
                <span className="text-[9px] font-semibold text-slate-400 uppercase">День {day}</span>
                {done ? (
                  <Check className="size-4 text-emerald-300" />
                ) : (
                  <span className={cn('text-[11px] font-bold tabular-nums', next ? 'text-gold-200' : 'text-slate-300')}>
                    {formatChips(dailyBonusAmount(day))}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <div className="relative mt-4">
        {status.available ? (
          <Button
            variant="gold"
            size="lg"
            icon={Gift}
            sound={false}
            className="w-full"
            onClick={() => onClaimed(claim(), 'Ежедневный бонус получен')}
          >
            Забрать {formatChips(status.amount)}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Lock className="size-3.5" /> Следующий бонус через
              </span>
              <span className="font-bold text-gold-200 tabular-nums">{formatDuration(status.nextAt - now)}</span>
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
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4',
        status.available
          ? 'border-cyan-300/40 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(7,11,24,0.6)_60%)]'
          : 'border-white/5 bg-white/[0.02]',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('grid size-12 shrink-0 place-items-center rounded-xl', status.broke ? 'bg-cyan-400/15' : 'bg-white/5')}>
          <Icon name="money-bag" size={32} className={cn(!status.broke && 'opacity-50 grayscale')} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-bold text-white">Помощь при банкротстве</h3>
          <p className="text-xs text-slate-400">
            {status.broke
              ? `Фишки закончились. Банк выдаёт ${formatChips(BANKRUPT_AID)} фишек не чаще раза в 8 часов.`
              : `Только если на балансе меньше ${formatChips(BANKRUPT_THRESHOLD)} фишек: ${formatChips(BANKRUPT_AID)} фишек раз в 8 часов.`}
          </p>
        </div>
      </div>
      {status.available && (
        <Button variant="cyan" size="lg" icon={LifeBuoy} sound={false} className="mt-4 w-full" onClick={() => onClaimed(claim(), 'Помощь получена')}>
          Получить {formatChips(status.amount)}
        </Button>
      )}
      {status.broke && !status.available && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Lock className="size-3.5" /> Банк откроется через
            </span>
            <span className="font-bold text-cyan-300 tabular-nums">{formatDuration(status.nextAt - now)}</span>
          </div>
          <CooldownBar remaining={status.nextAt - now} total={BANKRUPT_COOLDOWN_MS} />
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
