import { Flame, Gift, Heart, History, LayoutGrid, Search, Shuffle, Sparkles, Trophy, X, Zap, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { sfx } from '../audio/sfx'
import { GameArt } from '../components/game/GameArt'
import { ParticleField } from '../components/layout/Background'
import { GameCard } from '../components/lobby/GameCard'
import { LiveTicker } from '../components/lobby/LiveTicker'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Button } from '../components/ui/Button'
import { Panel, SectionTitle } from '../components/ui/Panel'
import { Icon } from '../components/ui/Icon'
import { StatTile } from '../components/ui/StatTile'
import { DailyBonusCard, RefillCard } from '../components/wallet/RewardsPanel'
import { GAME_IDS } from '../games/ids'
import { CATEGORY_LABELS, GAME_LIST, GAMES, type GameCategory } from '../games/meta'
import { cn } from '../lib/cn'
import { formatChips, formatMultiplier, formatPercent, formatSigned, plural, timeAgo } from '../lib/format'
import { randomInt } from '../lib/rng'
import { navigate, paths } from '../router/router'
import { ACHIEVEMENTS } from '../store/achievements'
import { hasDecided, useCasino, winRate } from '../store/casino'
import { levelFromXp } from '../store/progression'
import { useUi } from '../store/ui'

type Filter = 'all' | 'favorites' | GameCategory

const FILTER_ICONS: Record<Filter, LucideIcon> = {
  all: LayoutGrid,
  favorites: Heart,
  table: Sparkles,
  cards: Trophy,
  slots: Flame,
  instant: Zap,
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Усі ігри' },
  { value: 'favorites', label: 'Обране' },
  ...(Object.entries(CATEGORY_LABELS) as [GameCategory, string][]).map(([value, label]) => ({ value, label })),
]

function Hero() {
  const balance = useCasino((s) => s.balance)
  const xp = useCasino((s) => s.xp)
  const setRewardsOpen = useUi((s) => s.setRewardsOpen)
  const level = levelFromXp(xp)
  // Rotate the spotlight game once per page visit.
  const [spotlight] = useState(() => GAME_LIST[randomInt(GAME_LIST.length)])

  return (
    <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1.45fr_1fr]">
      <Panel strong className="relative overflow-hidden p-5 sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgba(25,245,163,0.14),transparent_65%),radial-gradient(50%_70%_at_0%_100%,rgba(212,165,67,0.12),transparent_70%)]" aria-hidden />
        <ParticleField density={0.8} />
        <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-sweep bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)]" aria-hidden />

        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-md border border-neon-emerald/25 bg-neon-emerald/[0.07] px-2.5 py-1 text-[10.5px] font-bold tracking-[0.18em] text-neon-emerald uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-neon-emerald shadow-[0_0_8px_rgba(25,245,163,1)]" />
            AXEdex Originals · {GAME_LIST.length} ігор
          </p>
          <h2 className="mt-4 font-display text-[28px] leading-[1.05] font-black tracking-tight text-white sm:text-[42px]">
            Преміальне казино.
            <br />
            <span className="text-gold-gradient">Нуль ризику.</span>
          </h2>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-slate-400">
            Рулетка, блекджек, слоти, «Ракета» та ще {GAME_LIST.length - 4} ігор на віртуальні фішки. Фішки не купуються — лише виграються.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-8">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold tracking-[0.18em] text-slate-500 uppercase">Ваш баланс</p>
              <AnimatedNumber value={balance} className="num mt-1.5 block truncate text-[40px] leading-none font-bold text-gold-gradient sm:text-[54px]" />
              <p className="mt-1.5 text-xs text-slate-500">віртуальних фішок</p>
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-semibold text-white">
                  Рівень {level.level} · <span className="text-neon-cyan">{level.title}</span>
                </span>
                <span className="num shrink-0 text-slate-500">
                  {formatChips(level.into)} / {formatChips(level.span)} XP
                </span>
              </div>
              <div className="well h-2.5 overflow-hidden rounded-full p-0">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-neon-cyan via-neon-emerald to-gold-200 shadow-[0_0_12px_rgba(25,245,163,0.7)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${level.progress * 100}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            <Button variant="emerald" size="lg" icon={Shuffle} sound="whoosh" onClick={() => navigate(paths.game(GAME_IDS[randomInt(GAME_IDS.length)]))}>
              Випадкова гра
            </Button>
            <Button variant="glass" size="lg" icon={Gift} onClick={() => setRewardsOpen(true)}>
              Бонуси
            </Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1 lg:grid-rows-[1fr_auto]">
        <button
          type="button"
          onClick={() => {
            sfx.play('whoosh')
            navigate(paths.game(spotlight.id))
          }}
          className="group relative min-h-40 overflow-hidden rounded-2xl border border-white/[0.07] text-left transition hover:border-white/20"
        >
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
            <GameArt game={spotlight} className="size-full" iconSize={92} iconPosition="right" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/50 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-[65%] flex-col justify-center gap-1.5 p-5">
            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-neon-red px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.12em] text-white uppercase shadow-[0_0_14px_-2px_rgba(255,77,109,0.8)]">
              <Flame className="size-3" /> Гра дня
            </span>
            <span className="font-display text-xl leading-tight font-bold text-white">{spotlight.name}</span>
            <span className="text-xs leading-snug text-slate-300">{spotlight.tagline}</span>
            <span className="mt-1 text-xs font-bold text-neon-emerald transition-transform group-hover:translate-x-1">Грати →</span>
          </div>
        </button>
        <DailyBonusCard compact />
      </div>
    </section>
  )
}

function StatsRow() {
  const lifetime = useCasino((s) => s.lifetime)
  const unlocked = useCasino((s) => Object.keys(s.achievements).length)
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      <StatTile index={0} emoji="bullseye" accent="cyan" label="Зіграно раундів" value={formatChips(lifetime.rounds)} hint={`${formatChips(lifetime.wins)} ${plural(lifetime.wins, ['перемога', 'перемоги', 'перемог'])}`} />
      <StatTile index={1} emoji="chart-increasing" accent="emerald" label="Частка перемог" value={hasDecided(lifetime) ? formatPercent(winRate(lifetime), 1) : '—'} hint="без урахування нічиїх" />
      <StatTile index={2} emoji="trophy" accent="gold" label="Найбільший виграш" value={lifetime.biggestWin > 0 ? `+${formatChips(lifetime.biggestWin)}` : '—'} hint={`Кращий множник ${lifetime.bestMultiplier ? formatMultiplier(lifetime.bestMultiplier) : '—'}`} />
      <StatTile index={3} emoji="sports-medal" accent="violet" label="Досягнення" value={`${unlocked} / ${ACHIEVEMENTS.length}`} hint={`Краща серія: ${lifetime.bestStreak}`} />
    </div>
  )
}

/** Stake-style bets table built from the player's own settled rounds. */
function RecentBets() {
  const recent = useCasino((s) => s.recent)
  return (
    <Panel className="overflow-hidden">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <SectionTitle
          action={
            <button type="button" onClick={() => navigate(paths.profile)} className="shrink-0 text-xs font-bold text-neon-emerald hover:text-white">
              Статистика
            </button>
          }
        >
          <span className="inline-flex items-center gap-2">
            <History className="hidden size-4 text-slate-500 sm:block" /> Мої останні ставки
          </span>
        </SectionTitle>
      </div>
      {recent.length === 0 ? (
        <p className="px-5 pt-4 pb-10 text-center text-sm text-slate-500">Тут з’являться ваші раунди. Оберіть гру вище!</p>
      ) : (
        <table className="w-full table-fixed text-left text-[13px]">
          <thead>
            <tr className="border-y border-white/[0.05] bg-white/[0.015] text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">
              <th className="px-4 py-2 font-bold sm:px-5">Гра</th>
              <th className="hidden w-28 px-2 py-2 font-bold md:table-cell">Час</th>
              <th className="hidden w-24 px-2 py-2 text-right font-bold sm:table-cell">Ставка</th>
              <th className="w-20 px-2 py-2 text-right font-bold">Множн.</th>
              <th className="w-24 px-4 py-2 text-right font-bold sm:w-28 sm:px-5">Виплата</th>
            </tr>
          </thead>
          <tbody>
            {recent.slice(0, 8).map((r, i) => {
              const g = GAMES[r.game]
              return (
                <tr key={r.id} className={cn('border-b border-white/[0.035] last:border-0', i % 2 === 1 && 'bg-white/[0.012]')}>
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon name={g.emoji} size={22} className="shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{g.name}</p>
                        <p className="truncate text-[11px] text-slate-500 md:hidden">{timeAgo(r.at)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden truncate px-2 py-2.5 text-slate-500 md:table-cell">{timeAgo(r.at)}</td>
                  <td className="num hidden px-2 py-2.5 text-right text-slate-300 sm:table-cell">{formatChips(r.wager)}</td>
                  <td className={cn('num px-2 py-2.5 text-right', r.multiplier >= 1 ? 'text-slate-200' : 'text-slate-500')}>{formatMultiplier(r.multiplier)}</td>
                  <td className={cn('num px-4 py-2.5 text-right font-bold sm:px-5', r.net > 0 ? 'text-neon-emerald' : r.net < 0 ? 'text-slate-500' : 'text-slate-300')}>
                    {formatSigned(r.net)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

/** The three locked achievements the player is closest to. */
function NextAchievements() {
  const state = useCasino()
  const snapshot = {
    balance: state.balance,
    peakBalance: state.lifetime.peakBalance,
    rounds: state.lifetime.rounds,
    currentStreak: state.lifetime.currentStreak,
    bestStreak: state.lifetime.bestStreak,
    refills: state.lifetime.refills,
    dailyStreak: state.daily.streak,
    level: levelFromXp(state.xp).level,
    gamesPlayed: GAME_IDS.filter((g) => (state.games[g]?.rounds ?? 0) > 0),
  }
  const next = ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.progress)
    .map((a) => {
      const [cur, target] = a.progress!(snapshot)
      return { a, cur, target, ratio: cur / target }
    })
    .sort((x, y) => y.ratio - x.ratio)
    .slice(0, 3)

  return (
    <Panel className="p-4 sm:p-5">
      <SectionTitle
        action={
          <button type="button" onClick={() => navigate(paths.profile)} className="shrink-0 text-xs font-bold text-neon-emerald hover:text-white">
            Усі досягнення
          </button>
        }
      >
        Найближчі цілі
      </SectionTitle>
      <ul className="space-y-3.5">
        {next.map(({ a, cur, target, ratio }) => (
          <li key={a.id} className="flex items-center gap-3">
            <span className="well grid size-11 shrink-0 place-items-center rounded-xl">
              <Icon name={a.icon} size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold text-white">{a.title}</p>
                <span className="num shrink-0 text-[11px] font-bold text-gold-300">+{formatChips(a.reward)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-emerald" style={{ width: `${Math.min(1, ratio) * 100}%` }} />
                </div>
                <span className="num shrink-0 text-[10px] text-slate-500">
                  {formatChips(cur)}/{formatChips(target)}
                </span>
              </div>
            </div>
          </li>
        ))}
        {next.length === 0 && <li className="text-sm text-slate-500">Усі цілі виконано!</li>}
      </ul>
    </Panel>
  )
}

export function Lobby() {
  const favorites = useCasino((s) => s.favorites)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const games = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GAME_LIST.filter((g) => {
      if (filter === 'favorites' && !favorites.includes(g.id)) return false
      if (filter !== 'all' && filter !== 'favorites' && g.category !== filter) return false
      if (!q) return true
      return `${g.name} ${g.tagline} ${CATEGORY_LABELS[g.category]}`.toLowerCase().includes(q)
    })
  }, [query, filter, favorites])

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 sm:space-y-6">
      <Hero />
      <LiveTicker />
      <StatsRow />

      <section aria-labelledby="games-heading" className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 id="games-heading" className="flex items-baseline gap-2 font-display text-xl font-bold text-white sm:text-2xl">
            Ігровий зал <span className="num text-sm font-medium text-slate-500">{GAME_LIST.length}</span>
          </h2>
          <label className="relative block md:w-80">
            <span className="sr-only">Пошук ігор</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Пошук ігор…"
              className="well h-11 w-full rounded-xl pr-10 pl-10 text-sm text-white outline-none transition-[border-color,box-shadow] placeholder:text-slate-600 focus:border-neon-emerald/50 focus:shadow-[inset_0_2px_16px_rgba(0,0,0,0.65),0_0_0_3px_rgba(25,245,163,0.12)]"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-white/10" aria-label="Очистити пошук">
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>

        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Категорії">
          {FILTERS.map((f) => {
            const active = filter === f.value
            const FIcon = FILTER_ICONS[f.value]
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  sfx.play('click')
                  setFilter(f.value)
                }}
                className={cn(
                  'relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3.5 text-[13px] font-bold transition-colors',
                  active ? 'border-neon-emerald/40 text-white' : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-white',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="lobby-filter"
                    className="absolute inset-0 rounded-[7px] bg-[linear-gradient(180deg,rgba(25,245,163,0.16),rgba(25,245,163,0.04))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_-6px_rgba(25,245,163,0.7)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                )}
                <FIcon
                  className={cn('relative size-3.5', active ? 'text-neon-emerald' : 'text-slate-500', f.value === 'favorites' && (active || favorites.length > 0) && 'fill-neon-red text-neon-red')}
                />
                <span className="relative">{f.label}</span>
                {f.value === 'favorites' && favorites.length > 0 && <span className="num relative text-[11px] text-slate-500">{favorites.length}</span>}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="popLayout">
          {games.length > 0 ? (
            <motion.div
              key={`${filter}-${query}`}
              className="grid grid-cols-2 gap-2.5 min-[540px]:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {games.map((g, i) => (
                <GameCard key={g.id} game={g} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl px-4 py-14 text-center">
              <p className="text-base font-semibold text-white">{filter === 'favorites' ? 'В обраному поки порожньо' : 'Нічого не знайдено'}</p>
              <p className="mt-1 text-sm text-slate-400">
                {filter === 'favorites' ? 'Натисніть на сердечко на картці гри, щоб додати її сюди.' : 'Спробуйте інший запит або категорію.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <RecentBets />
        <div className="space-y-4">
          <NextAchievements />
          <RefillCard />
        </div>
      </section>

      <footer className="flex flex-col items-center gap-1 pt-2 pb-1 text-center">
        <span className="h-px w-24 bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
        <p className="mt-2 text-xs text-slate-500">
          AXEdex · Зроблено by <span className="font-display font-bold text-gold-gradient">kyrapyto</span>
        </p>
      </footer>
    </div>
  )
}
