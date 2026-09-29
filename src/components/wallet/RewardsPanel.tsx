import { CalendarCheck, Check, Droplets, Gift, LifeBuoy, Lock } from 'lucide-react'
import { motion } from 'motion/react'
import { sfx, haptic } from '../../audio/sfx'
import { useNow } from '../../hooks/useNow'
import { cn } from '../../lib/cn'
import { formatChips, formatDuration } from '../../lib/format'
import {
  canRefill,
  DAILY_COOLDOWN_MS,
  DAILY_MAX_STREAK,
  dailyBonusAmount,
  FAUCET_COOLDOWN_MS,
  getDailyStatus,
  getFaucetStatus,
  REFILL_TARGET,
  REFILL_THRESHOLD,
  useCasino,
} from '../../store/casino'
import { celebrate } from '../../store/fx'
import { toast } from '../../store/toasts'
import { Button } from '../ui/Button'

function onClaimed(amount: number, title: string) {
  if (amount <= 0) return
  sfx.play('cashout')
  haptic([20, 30, 20])
  celebrate('coins', 1.2)
  toast({ kind: 'bonus', title, message: 'Фишки зачислены на баланс.', amount })
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
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-400/15 text-gold-300">
          <CalendarCheck className="size-6" />
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

export function FaucetCard() {
  const now = useNow()
  const faucetAt = useCasino((s) => s.faucetLastClaimAt)
  const xp = useCasino((s) => s.xp)
  const claim = useCasino((s) => s.claimFaucet)
  const status = getFaucetStatus(faucetAt, xp, now)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(52,245,160,0.12),rgba(7,11,24,0.6)_60%)] p-4">
      <div className="absolute -top-10 -right-10 size-36 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
          <Droplets className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-bold text-white">Ежечасный кран</h3>
          <p className="text-xs text-slate-400">Бесплатные фишки раз в час. Сумма растёт с уровнем.</p>
        </div>
      </div>
      <div className="relative mt-4">
        {status.available ? (
          <Button
            variant="emerald"
            size="lg"
            icon={Droplets}
            sound={false}
            className="w-full"
            onClick={() => onClaimed(claim(), 'Кран открыт')}
          >
            Забрать {formatChips(status.amount)}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Кран наполнится через</span>
              <span className="font-bold text-emerald-300 tabular-nums">{formatDuration(status.nextAt - now)}</span>
            </div>
            <CooldownBar remaining={status.nextAt - now} total={FAUCET_COOLDOWN_MS} />
          </div>
        )}
      </div>
    </div>
  )
}

export function RefillCard() {
  const balance = useCasino((s) => s.balance)
  const claim = useCasino((s) => s.claimRefill)
  const available = canRefill({ balance })
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4',
        available
          ? 'border-cyan-300/40 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(7,11,24,0.6)_60%)]'
          : 'border-white/5 bg-white/[0.02]',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('grid size-11 shrink-0 place-items-center rounded-xl', available ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-slate-500')}>
          <LifeBuoy className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-bold text-white">Бесплатное пополнение</h3>
          <p className="text-xs text-slate-400">
            {available
              ? `Баланс почти пуст — восстановим его до ${formatChips(REFILL_TARGET)} фишек.`
              : `Доступно, когда на балансе меньше ${formatChips(REFILL_THRESHOLD)} фишек.`}
          </p>
        </div>
      </div>
      {available && (
        <Button
          variant="cyan"
          size="lg"
          icon={LifeBuoy}
          sound={false}
          className="mt-4 w-full"
          onClick={() => onClaimed(claim(), 'Баланс пополнен')}
        >
          Пополнить бесплатно
        </Button>
      )}
    </div>
  )
}

/** Everything free, in one place: daily bonus, hourly faucet, refill. */
export function RewardsPanel() {
  return (
    <div className="space-y-3">
      <RefillCard />
      <DailyBonusCard />
      <FaucetCard />
      <p className="px-1 text-center text-[11px] leading-relaxed text-slate-500">
        Фишки виртуальные и бесплатные: их нельзя купить, продать или обменять на деньги.
      </p>
    </div>
  )
}
