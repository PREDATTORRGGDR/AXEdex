import { Flame, Gift, Heart, History, Search, Shuffle, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { sfx } from '../audio/sfx'
import { GameArt } from '../components/game/GameArt'
import { GameCard } from '../components/lobby/GameCard'
import { LiveTicker } from '../components/lobby/LiveTicker'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Button } from '../components/ui/Button'
import { Panel, SectionTitle } from '../components/ui/Panel'
import { Icon } from '../components/ui/Icon'
import { StatTile } from '../components/ui/StatTile'
import { DailyBonusCard, FaucetCard } from '../components/wallet/RewardsPanel'
import { GAME_IDS } from '../games/ids'
import { CATEGORY_LABELS, GAME_LIST, GAMES, type GameCategory } from '../games/meta'
import { cn } from '../lib/cn'
import { formatChips, formatMultiplier, formatPercent, formatSigned, plural, timeAgo } from '../lib/format'
import { randomInt } from '../lib/rng'
import { navigate, paths } from '../router/router'
import { hasDecided, useCasino, winRate } from '../store/casino'
import { levelFromXp } from '../store/progression'
import { useUi } from '../store/ui'

type Filter = 'all' | 'favorites' | GameCategory

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все игры' },
  { value: 'favorites', label: 'Избранное' },
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
    <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <Panel strong className="relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -top-24 -right-24 size-72 animate-[spin_40s_linear_infinite] rounded-full border border-dashed border-gold-400/20" />
        <div className="absolute -top-12 -right-12 size-48 animate-[spin_28s_linear_infinite_reverse] rounded-full border border-emerald-400/15" />
        <div className="absolute -bottom-20 -left-10 size-64 rounded-full bg-gold-500/10 blur-3xl" />

        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/10 px-3 py-1 text-[11px] font-bold tracking-wider text-gold-200 uppercase">
            <Sparkles className="size-3.5" /> Добро пожаловать в AXEdex
          </p>
          <h2 className="mt-4 font-display text-2xl leading-tight font-black text-white sm:text-4xl">
            {GAME_LIST.length} игр. <span className="text-gold-gradient">Ноль риска.</span>
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Рулетка, блэкджек, слоты, «Ракета» и ещё {GAME_LIST.length - 4} игр на бесплатные виртуальные фишки.
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <p className="text-xs font-medium text-slate-400">Ваш баланс</p>
              <AnimatedNumber value={balance} className="block text-5xl font-black tracking-tight text-gold-gradient sm:text-6xl" />
              <p className="mt-1 text-xs text-slate-500">виртуальных фишек</p>
            </div>
            <div className="min-w-48 flex-1">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  Уровень {level.level} · <span className="text-violet-300">{level.title}</span>
                </span>
                <span className="text-slate-400 tabular-nums">
                  {formatChips(level.into)} / {formatChips(level.span)} XP
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-emerald-300 shadow-[0_0_12px_rgba(167,139,250,0.7)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${level.progress * 100}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button variant="gold" size="lg" icon={Shuffle} sound="whoosh" onClick={() => navigate(paths.game(GAME_IDS[randomInt(GAME_IDS.length)]))}>
              Случайная игра
            </Button>
            <Button variant="glass" size="lg" icon={Gift} onClick={() => setRewardsOpen(true)}>
              Бесплатные фишки
            </Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <button
          type="button"
          onClick={() => {
            sfx.play('whoosh')
            navigate(paths.game(spotlight.id))
          }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 text-left"
        >
          <GameArt game={spotlight} className="h-full min-h-40 transition-transform duration-700 group-hover:scale-105" iconSize={84} iconPosition="right" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/40 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center gap-1 p-5">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
              <Flame className="size-3" /> Игра дня
            </span>
            <span className="font-display text-xl font-bold text-white">{spotlight.name}</span>
            <span className="max-w-[16rem] text-xs text-slate-300">{spotlight.tagline}</span>
          </div>
        </button>
        <FaucetCard />
      </div>
    </section>
  )
}

function StatsRow() {
  const lifetime = useCasino((s) => s.lifetime)
  const unlocked = useCasino((s) => Object.keys(s.achievements).length)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile index={0} emoji="bullseye" accent="cyan" label="Сыграно раундов" value={formatChips(lifetime.rounds)} hint={`${formatChips(lifetime.wins)} ${plural(lifetime.wins, ['победа', 'победы', 'побед'])}`} />
      <StatTile index={1} emoji="chart-increasing" accent="emerald" label="Доля побед" value={hasDecided(lifetime) ? formatPercent(winRate(lifetime), 1) : '—'} hint="без учёта ничьих" />
      <StatTile index={2} emoji="trophy" accent="gold" label="Крупнейший выигрыш" value={lifetime.biggestWin > 0 ? `+${formatChips(lifetime.biggestWin)}` : '—'} hint={`Лучший множитель ${lifetime.bestMultiplier ? formatMultiplier(lifetime.bestMultiplier) : '—'}`} />
      <StatTile index={3} emoji="sports-medal" accent="violet" label="Достижения" value={`${unlocked}`} hint={`Лучшая серия: ${lifetime.bestStreak}`} />
    </div>
  )
}

function RecentActivity() {
  const recent = useCasino((s) => s.recent)
  return (
    <Panel className="p-4 sm:p-5">
      <SectionTitle
        action={
          <button type="button" onClick={() => navigate(paths.profile)} className="text-xs font-semibold text-gold-300 hover:text-gold-200">
            Вся статистика
          </button>
        }
      >
        <span className="inline-flex items-center gap-2">
          <History className="size-4" /> Последние раунды
        </span>
      </SectionTitle>
      {recent.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Здесь появятся ваши раунды. Выберите игру выше!</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {recent.slice(0, 7).map((r) => {
            const g = GAMES[r.game]
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}>
                  <Icon name={g.emoji} size={26} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{g.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {r.detail ? `${r.detail} · ` : ''}
                    {timeAgo(r.at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-bold tabular-nums', r.net > 0 ? 'text-emerald-300' : r.net < 0 ? 'text-rose-300' : 'text-slate-300')}>
                    {formatSigned(r.net)}
                  </p>
                  <p className="text-[11px] text-slate-500 tabular-nums">ставка {formatChips(r.wager)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
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
    <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
      <Hero />
      <LiveTicker />
      <StatsRow />

      <section aria-labelledby="games-heading" className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 id="games-heading" className="font-display text-xl font-bold text-white sm:text-2xl">
            Игровой зал <span className="text-sm font-medium text-slate-500">· {GAME_LIST.length} игр</span>
          </h2>
          <label className="relative block md:w-80">
            <span className="sr-only">Поиск игр</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск игр…"
              className="h-11 w-full rounded-xl border border-white/10 bg-ink-900/70 pr-10 pl-10 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-gold-400/50 focus:shadow-glow-gold"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-white/10" aria-label="Очистить поиск">
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Категории">
          {FILTERS.map((f) => {
            const active = filter === f.value
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
                  'relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
                  active ? 'text-ink-950' : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white',
                )}
              >
                {active && (
                  <motion.span layoutId="lobby-filter" className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,#fff0bd,#fcd96b_40%,#e2ab1c)] shadow-glow-gold" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />
                )}
                {f.value === 'favorites' && <Heart className={cn('relative size-3.5', active ? 'fill-ink-950' : 'fill-rose-400 text-rose-400')} />}
                <span className="relative">{f.label}</span>
                {f.value === 'favorites' && favorites.length > 0 && <span className="relative text-xs opacity-70">{favorites.length}</span>}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="popLayout">
          {games.length > 0 ? (
            <motion.div key={`${filter}-${query}`} className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {games.map((g, i) => (
                <GameCard key={g.id} game={g} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl py-14 text-center">
              <p className="text-base font-semibold text-white">{filter === 'favorites' ? 'В избранном пока пусто' : 'Ничего не найдено'}</p>
              <p className="mt-1 text-sm text-slate-400">
                {filter === 'favorites' ? 'Нажмите на сердечко на карточке игры, чтобы добавить её сюда.' : 'Попробуйте другой запрос или категорию.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <RecentActivity />
        <DailyBonusCard />
      </section>
    </div>
  )
}
