import { Radio } from 'lucide-react'
import { GAMES } from '../../games/meta'
import { cn } from '../../lib/cn'
import { formatChips, formatMultiplier, formatSigned, plural } from '../../lib/format'
import { ACHIEVEMENTS } from '../../store/achievements'
import { DAILY_MAX_STREAK, dailyBonusAmount, useCasino } from '../../store/casino'
import { levelFromXp } from '../../store/progression'

interface TickerItem {
  key: string
  text: string
  tone: 'win' | 'loss' | 'neutral' | 'gold'
}

const TIPS: TickerItem[] = [
  { key: 't1', text: `Щоденний бонус росте 7 днів поспіль — до ${dailyBonusAmount(DAILY_MAX_STREAK)} фішок`, tone: 'gold' },
  { key: 't2', text: 'Бережіть фішки: допомога банку — не частіше ніж раз на 8 годин', tone: 'neutral' },
  { key: 't3', text: 'Позначайте улюблені ігри сердечком — вони завжди будуть першими', tone: 'neutral' },
  { key: 't4', text: 'Кожен раунд дає досвід, а новий рівень — трохи фішок', tone: 'gold' },
  {
    key: 't5',
    text: `${ACHIEVEMENTS.length} ${plural(ACHIEVEMENTS.length, ['досягнення чекає', 'досягнення чекають', 'досягнень чекають'])} на вас у профілі`,
    tone: 'neutral',
  },
]

/** Scrolling marquee built from the player's real activity and records. */
export function LiveTicker({ className }: { className?: string }) {
  const recent = useCasino((s) => s.recent)
  const lifetime = useCasino((s) => s.lifetime)
  const xp = useCasino((s) => s.xp)

  const items: TickerItem[] = recent.slice(0, 12).map((r) => ({
    key: r.id,
    text: `${GAMES[r.game].name}: ${formatSigned(r.net)}${r.net > 0 ? ` (${formatMultiplier(r.multiplier)})` : ''}`,
    tone: r.net > 0 ? 'win' : r.net < 0 ? 'loss' : 'neutral',
  }))
  const level = levelFromXp(xp)
  items.push({ key: 'lvl', text: `Рівень ${level.level} · ${level.title}`, tone: 'gold' })
  if (lifetime.bestMultiplier > 0) {
    items.push({ key: 'bm', text: `Рекорд множника: ${formatMultiplier(lifetime.bestMultiplier)}`, tone: 'gold' })
  }
  if (lifetime.biggestWin > 0) {
    items.push({ key: 'bw', text: `Найбільший виграш: +${formatChips(lifetime.biggestWin)}`, tone: 'win' })
  }
  if (lifetime.bestStreak > 1) {
    items.push({
      key: 'bs',
      text: `Краща серія: ${lifetime.bestStreak} ${plural(lifetime.bestStreak, ['перемога', 'перемоги', 'перемог'])} поспіль`,
      tone: 'win',
    })
  }
  items.push(...TIPS)

  const row = (suffix: string) =>
    items.map((it) => (
      <li key={it.key + suffix} className="flex shrink-0 items-center gap-2 px-4 text-xs font-medium whitespace-nowrap sm:px-5">
        <span
          className={cn(
            'size-1.5 rounded-full',
            it.tone === 'win' && 'bg-neon-emerald shadow-[0_0_8px_rgba(25,245,163,0.9)]',
            it.tone === 'loss' && 'bg-neon-red',
            it.tone === 'gold' && 'bg-gold-300 shadow-[0_0_8px_rgba(230,194,106,0.9)]',
            it.tone === 'neutral' && 'bg-slate-600',
          )}
        />
        <span className={cn(it.tone === 'win' ? 'text-emerald-100' : it.tone === 'gold' ? 'text-gold-100' : 'text-slate-400')}>
          {it.text}
        </span>
      </li>
    ))

  return (
    <div className={cn('glass flex h-10 items-center overflow-hidden rounded-xl sm:h-11', className)}>
      <div className="z-10 flex h-full shrink-0 items-center gap-2 border-r border-white/[0.06] bg-ink-950/80 px-3 sm:px-4">
        <Radio className="size-4 animate-pulse text-neon-red" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] text-white uppercase">Наживо</span>
      </div>
      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]">
        <ul className="flex w-max animate-marquee hover:[animation-play-state:paused]" aria-label="Стрічка подій">
          {row('a')}
          {row('b')}
        </ul>
      </div>
    </div>
  )
}
