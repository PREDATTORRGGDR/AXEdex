import { Award, BarChart3, Coins, Crown, Flame, Gift, RotateCcw, Settings2, Target, TrendingUp, Trophy, UserRound, Vibrate, Volume2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { AchievementGrid } from '../components/profile/AchievementGrid'
import { BalanceChart } from '../components/profile/BalanceChart'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Panel, SectionTitle } from '../components/ui/Panel'
import { StatTile } from '../components/ui/StatTile'
import { LevelBadge } from '../components/wallet/LevelBadge'
import { GAME_IDS } from '../games/ids'
import { GAMES } from '../games/meta'
import { cn } from '../lib/cn'
import { formatChips, formatMultiplier, formatPercent, formatSigned, plural } from '../lib/format'
import { navigate, paths } from '../router/router'
import { ACHIEVEMENTS } from '../store/achievements'
import { hasDecided, useCasino, winRate } from '../store/casino'
import { levelFromXp, levelUpReward } from '../store/progression'
import { toast } from '../store/toasts'

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-emerald-400' : 'bg-white/10')}
    >
      <motion.span
        className="absolute top-1 left-1 size-5 rounded-full bg-white shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      />
    </button>
  )
}

function SettingsPanel() {
  const settings = useCasino((s) => s.settings)
  const update = useCasino((s) => s.updateSettings)
  const reset = useCasino((s) => s.resetProgress)
  const [confirm, setConfirm] = useState(false)

  return (
    <Panel className="p-4 sm:p-5">
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Settings2 className="size-4" /> Настройки
        </span>
      </SectionTitle>
      <div className="divide-y divide-white/5">
        <div className="flex items-center gap-3 py-3">
          <Volume2 className="size-5 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Звуковые эффекты</p>
            <p className="text-xs text-slate-500">Синтезированные звуки фишек, барабанов и побед</p>
          </div>
          <Toggle
            label="Звуковые эффекты"
            checked={settings.sound}
            onChange={(sound) => {
              update({ sound })
              if (sound) window.setTimeout(() => sfx.play('ping'), 0)
            }}
          />
        </div>
        <div className="flex items-center gap-3 py-3">
          <span className="w-5" />
          <label htmlFor="volume" className="flex-1 text-sm text-slate-300">
            Громкость
          </label>
          <input
            id="volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            disabled={!settings.sound}
            onChange={(e) => update({ volume: Number(e.target.value) })}
            onPointerUp={() => sfx.play('coin')}
            className="w-36 accent-gold-400 disabled:opacity-40"
          />
          <span className="w-10 text-right text-xs text-slate-400 tabular-nums">{formatPercent(settings.volume)}</span>
        </div>
        <div className="flex items-center gap-3 py-3">
          <Vibrate className="size-5 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Вибрация</p>
            <p className="text-xs text-slate-500">Тактильный отклик на смартфонах</p>
          </div>
          <Toggle label="Вибрация" checked={settings.haptics} onChange={(haptics) => update({ haptics })} />
        </div>
        <div className="flex items-center gap-3 pt-3">
          <RotateCcw className="size-5 text-rose-300" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Начать заново</p>
            <p className="text-xs text-slate-500">Сбросить баланс, опыт, статистику и достижения</p>
          </div>
          <Button variant="ghost" size="sm" className="text-rose-300 hover:text-rose-200" onClick={() => setConfirm(true)}>
            Сбросить
          </Button>
        </div>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Сбросить прогресс?" sheet={false}>
        <p className="text-sm text-slate-300">
          Баланс вернётся к стартовым 10 000 фишек, а опыт, статистика и достижения будут удалены. Это действие нельзя
          отменить.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="glass" className="flex-1" onClick={() => setConfirm(false)}>
            Отмена
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              reset()
              setConfirm(false)
              toast({ kind: 'info', title: 'Прогресс сброшен', message: 'Удачи в новой игре!' })
            }}
          >
            Сбросить всё
          </Button>
        </div>
      </Modal>
    </Panel>
  )
}

function GameTable() {
  const games = useCasino((s) => s.games)
  const rows = GAME_IDS.map((id) => ({ id, meta: GAMES[id], stats: games[id] })).sort(
    (a, b) => (b.stats?.rounds ?? 0) - (a.stats?.rounds ?? 0),
  )
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-[11px] tracking-wider text-slate-500 uppercase">
            <th className="py-2 pr-3 font-semibold">Игра</th>
            <th className="px-3 py-2 text-right font-semibold">Раунды</th>
            <th className="px-3 py-2 text-right font-semibold">Доля побед</th>
            <th className="px-3 py-2 text-right font-semibold">Поставлено</th>
            <th className="px-3 py-2 text-right font-semibold">Итог</th>
            <th className="py-2 pl-3 text-right font-semibold">Лучший ×</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(({ id, meta, stats }) => {
            const Icon = meta.icon
            const net = stats ? stats.returned - stats.wagered : 0
            return (
              <tr key={id} className="cursor-pointer transition hover:bg-white/[0.03]" onClick={() => navigate(paths.game(id))}>
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-lg" style={{ background: `linear-gradient(135deg, ${meta.colors[0]}, ${meta.colors[1]})` }}>
                      <Icon className="size-3.5 text-white" />
                    </span>
                    <span className="font-medium text-white">{meta.name}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-slate-300 tabular-nums">{formatChips(stats?.rounds ?? 0)}</td>
                <td className="px-3 py-2.5 text-right text-slate-300 tabular-nums">{hasDecided(stats) ? formatPercent(winRate(stats!)) : '—'}</td>
                <td className="px-3 py-2.5 text-right text-slate-300 tabular-nums">{formatChips(stats?.wagered ?? 0)}</td>
                <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', net > 0 ? 'text-emerald-300' : net < 0 ? 'text-rose-300' : 'text-slate-400')}>
                  {formatSigned(net)}
                </td>
                <td className="py-2.5 pl-3 text-right text-slate-300 tabular-nums">{stats?.bestMultiplier ? formatMultiplier(stats.bestMultiplier) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Profile() {
  const lifetime = useCasino((s) => s.lifetime)
  const xp = useCasino((s) => s.xp)
  const history = useCasino((s) => s.balanceHistory)
  const unlocked = useCasino((s) => Object.keys(s.achievements).length)
  const daily = useCasino((s) => s.daily)
  const level = levelFromXp(xp)
  const net = lifetime.returned - lifetime.wagered

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <Panel strong className="relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -top-20 -right-20 size-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute -bottom-24 left-10 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="grid size-20 place-items-center rounded-3xl bg-[linear-gradient(135deg,#a78bfa,#34f5a0)] p-0.5 shadow-[0_0_40px_-8px_rgba(167,139,250,0.7)]">
              <div className="grid size-full place-items-center rounded-[22px] bg-ink-900">
                <UserRound className="size-10 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <div className="absolute -right-3 -bottom-3">
              <LevelBadge size={40} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">{level.title}</p>
            <h2 className="font-display text-2xl font-black text-white sm:text-3xl">Игрок AXEdex</h2>
            <div className="mt-3 max-w-xl">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-semibold text-white">Уровень {level.level}</span>
                <span className="text-slate-400 tabular-nums">
                  {formatChips(level.into)} / {formatChips(level.span)} XP · награда за уровень {level.level + 1}: {formatChips(levelUpReward(level.level + 1))}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-emerald-300 shadow-[0_0_14px_rgba(167,139,250,0.7)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${level.progress * 100}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">Всего опыта: {formatChips(xp)} XP. Опыт начисляется за каждый сыгранный раунд.</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} icon={Target} accent="cyan" label="Сыграно раундов" value={formatChips(lifetime.rounds)} hint={`${formatChips(lifetime.wins)} побед · ${formatChips(lifetime.losses)} пораж. · ${formatChips(lifetime.pushes)} ничьих`} />
        <StatTile index={1} icon={Crown} accent="emerald" label="Доля побед" value={hasDecided(lifetime) ? formatPercent(winRate(lifetime), 1) : '—'} hint="без учёта ничьих" />
        <StatTile index={2} icon={Trophy} accent="gold" label="Крупнейший выигрыш" value={lifetime.biggestWin > 0 ? `+${formatChips(lifetime.biggestWin)}` : '—'} hint="чистая прибыль за раунд" />
        <StatTile index={3} icon={TrendingUp} accent="violet" label="Лучший множитель" value={lifetime.bestMultiplier ? formatMultiplier(lifetime.bestMultiplier) : '—'} hint={`Лучшая серия: ${lifetime.bestStreak} ${plural(lifetime.bestStreak, ['победа', 'победы', 'побед'])}`} />
        <StatTile index={4} icon={Coins} accent="gold" label="Всего поставлено" value={formatChips(lifetime.wagered)} hint={`Возвращено ${formatChips(lifetime.returned)}`} />
        <StatTile index={5} icon={BarChart3} accent={net >= 0 ? 'emerald' : 'rose'} label="Чистый итог" value={formatSigned(net)} hint="за всё время" />
        <StatTile index={6} icon={Gift} accent="emerald" label="Бесплатные фишки" value={formatChips(lifetime.rewardChips)} hint={`Бонусов: ${lifetime.dailyClaims} · кранов: ${lifetime.faucetClaims} · пополнений: ${lifetime.refills}`} />
        <StatTile index={7} icon={Flame} accent="rose" label="Серия бонусов" value={`${daily.streak} / 7`} hint={`Пик баланса: ${formatChips(lifetime.peakBalance)}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <SectionTitle>Динамика баланса</SectionTitle>
          <BalanceChart points={history} />
        </Panel>
        <SettingsPanel />
      </div>

      <Panel className="p-4 sm:p-5">
        <SectionTitle>Статистика по играм</SectionTitle>
        <GameTable />
      </Panel>

      <Panel className="p-4 sm:p-5">
        <SectionTitle
          action={
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-300">
              <Award className="size-4" /> {unlocked} из {ACHIEVEMENTS.length}
            </span>
          }
        >
          Достижения
        </SectionTitle>
        <AchievementGrid />
      </Panel>
    </div>
  )
}
