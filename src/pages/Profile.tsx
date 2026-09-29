import { Award, Download, Gauge, HardDriveDownload, RotateCcw, Settings2, Upload, Vibrate, Volume2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { SecretCredit } from '../components/brand/SecretCredit'
import { AchievementGrid } from '../components/profile/AchievementGrid'
import { BalanceChart } from '../components/profile/BalanceChart'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { Panel, SectionTitle } from '../components/ui/Panel'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Switch } from '../components/ui/Switch'
import { StatTile } from '../components/ui/StatTile'
import { LogoMark } from '../components/layout/Logo'
import { LevelBadge } from '../components/wallet/LevelBadge'
import { GAME_IDS } from '../games/ids'
import { GAMES } from '../games/meta'
import { cn } from '../lib/cn'
import { formatChips, formatMultiplier, formatPercent, formatSigned, plural } from '../lib/format'
import { navigate, paths } from '../router/router'
import { ACHIEVEMENTS } from '../store/achievements'
import { hasDecided, STARTING_BALANCE, useCasino, winRate } from '../store/casino'
import { usePerf } from '../store/perf'
import { levelFromXp, levelUpReward } from '../store/progression'
import { exportSave, importSave } from '../store/backup'
import { toast } from '../store/toasts'

function SettingRow({ icon: IconC, title, hint, children, tone = 'text-slate-500' }: { icon: typeof Volume2; title: string; hint?: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 py-3.5">
      <IconC className={cn('size-5 shrink-0', tone)} />
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-sm font-semibold text-white">{title}</p>
        {hint && <p className="text-xs leading-snug text-slate-500">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function SettingsPanel() {
  const settings = useCasino((s) => s.settings)
  const update = useCasino((s) => s.updateSettings)
  const reset = useCasino((s) => s.resetProgress)
  const autoLow = usePerf((s) => s.autoLow)
  const [confirm, setConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      await importSave(file)
      toast({ kind: 'info', title: 'Збереження завантажено', message: 'Сторінка оновиться за секунду.' })
      window.setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      toast({ kind: 'warning', title: 'Не вдалося завантажити', message: e instanceof Error ? e.message : 'Невідома помилка.' })
    }
  }

  return (
    <Panel className="p-4 sm:p-5">
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Settings2 className="size-4 text-slate-500" /> Налаштування
        </span>
      </SectionTitle>
      <div className="divide-y divide-white/[0.05]">
        <SettingRow icon={Volume2} title="Звукові ефекти" hint="Синтезовані звуки фішок, барабанів і перемог">
          <Switch
            label="Звукові ефекти"
            checked={settings.sound}
            onChange={(sound) => {
              update({ sound })
              if (sound) window.setTimeout(() => sfx.play('ping'), 0)
            }}
          />
        </SettingRow>
        <div className="flex items-center gap-3 py-3.5">
          <span className="w-5 shrink-0" />
          <label htmlFor="volume" className="flex-1 text-sm text-slate-300">
            Гучність
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
            className="w-28 accent-neon-emerald disabled:opacity-40 sm:w-36"
          />
          <span className="num w-10 shrink-0 text-right text-xs text-slate-400">{formatPercent(settings.volume)}</span>
        </div>
        <SettingRow icon={Vibrate} title="Вібрація" hint="Тактильний відгук на смартфонах">
          <Switch label="Вібрація" checked={settings.haptics} onChange={(haptics) => update({ haptics })} />
        </SettingRow>
        <SettingRow
          icon={Gauge}
          title="Якість графіки"
          hint={settings.quality === 'auto' ? (autoLow ? 'Авто: увімкнено економний режим для плавності' : 'Авто: повні ефекти') : 'Економ вимикає розмиття скла та фонові анімації'}
        >
          <SegmentedControl
            size="sm"
            label="Якість графіки"
            className="w-full sm:w-56"
            value={settings.quality}
            onChange={(quality) => update({ quality })}
            options={[
              { value: 'auto', label: 'Авто' },
              { value: 'high', label: 'Висока' },
              { value: 'low', label: 'Економ' },
            ]}
          />
        </SettingRow>
        <SettingRow icon={HardDriveDownload} tone="text-neon-emerald" title="Збереження" hint="Прогрес автоматично зберігається в цьому браузері. Зробіть копію, щоб перенести його.">
          <div className="flex gap-2">
            <Button variant="glass" size="sm" icon={Download} onClick={exportSave}>
              Завантажити
            </Button>
            <Button variant="glass" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>
              Відновити
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onImport(e.target.files?.[0])} />
          </div>
        </SettingRow>
        <SettingRow icon={RotateCcw} tone="text-neon-red" title="Почати заново" hint="Скинути баланс, досвід, статистику й досягнення">
          <Button variant="ghost" size="sm" className="!text-neon-red hover:!text-white" onClick={() => setConfirm(true)}>
            Скинути
          </Button>
        </SettingRow>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Скинути прогрес?" sheet={false}>
        <p className="text-sm leading-relaxed text-slate-300">
          Баланс повернеться до стартових {formatChips(STARTING_BALANCE)} фішок, а досвід, статистику й досягнення буде видалено. Цю дію не можна
          скасувати.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="glass" className="flex-1" onClick={() => setConfirm(false)}>
            Скасувати
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              reset()
              setConfirm(false)
              toast({ kind: 'info', title: 'Прогрес скинуто', message: 'Удачі в новій грі!' })
            }}
          >
            Скинути все
          </Button>
        </div>
      </Modal>
    </Panel>
  )
}

function GameTable() {
  const games = useCasino((s) => s.games)
  const rows = GAME_IDS.map((id) => ({ id, meta: GAMES[id], stats: games[id] })).sort((a, b) => (b.stats?.rounds ?? 0) - (a.stats?.rounds ?? 0))
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[600px] text-[13px]">
        <thead>
          <tr className="border-y border-white/[0.05] bg-white/[0.015] text-left text-[10px] tracking-[0.14em] text-slate-500 uppercase">
            <th className="py-2 pr-3 pl-4 font-bold sm:pl-5">Гра</th>
            <th className="px-3 py-2 text-right font-bold">Раунди</th>
            <th className="px-3 py-2 text-right font-bold">Перемоги</th>
            <th className="px-3 py-2 text-right font-bold">Поставлено</th>
            <th className="px-3 py-2 text-right font-bold">Підсумок</th>
            <th className="py-2 pr-4 pl-3 text-right font-bold sm:pr-5">Кращий ×</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, meta, stats }, i) => {
            const net = stats ? stats.returned - stats.wagered : 0
            return (
              <tr
                key={id}
                className={cn('cursor-pointer border-b border-white/[0.035] transition last:border-0 hover:bg-white/[0.03]', i % 2 === 1 && 'bg-white/[0.012]')}
                onClick={() => navigate(paths.game(id))}
              >
                <td className="py-2.5 pr-3 pl-4 sm:pl-5">
                  <span className="flex items-center gap-2.5">
                    <Icon name={meta.emoji} size={22} className="shrink-0" />
                    <span className="truncate font-semibold text-white">{meta.name}</span>
                  </span>
                </td>
                <td className="num px-3 py-2.5 text-right text-slate-300">{formatChips(stats?.rounds ?? 0)}</td>
                <td className="num px-3 py-2.5 text-right text-slate-300">{hasDecided(stats) ? formatPercent(winRate(stats!)) : '—'}</td>
                <td className="num px-3 py-2.5 text-right text-slate-300">{formatChips(stats?.wagered ?? 0)}</td>
                <td className={cn('num px-3 py-2.5 text-right font-bold', net > 0 ? 'text-neon-emerald' : net < 0 ? 'text-neon-red/90' : 'text-slate-500')}>{formatSigned(net)}</td>
                <td className="num py-2.5 pr-4 pl-3 text-right text-slate-300 sm:pr-5">{stats?.bestMultiplier ? formatMultiplier(stats.bestMultiplier) : '—'}</td>
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
    <div className="mx-auto w-full max-w-[1400px] space-y-4 sm:space-y-5">
      <Panel strong className="relative overflow-hidden p-5 sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(60%_90%_at_100%_0%,rgba(34,225,255,0.12),transparent_65%),radial-gradient(50%_80%_at_0%_100%,rgba(25,245,163,0.1),transparent_70%)]" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <div className="grid size-20 place-items-center rounded-2xl bg-[linear-gradient(135deg,#22e1ff,#19f5a3_50%,#e6c26a)] p-px shadow-[0_0_40px_-8px_rgba(25,245,163,0.6)]">
              <div className="grid size-full place-items-center rounded-[15px] bg-ink-900">
                <LogoMark className="size-14" />
              </div>
            </div>
            <div className="absolute -right-3 -bottom-3">
              <LevelBadge size={40} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-[0.2em] text-neon-cyan uppercase">{level.title}</p>
            <h2 className="font-display text-2xl font-black text-white sm:text-3xl">Гравець AXEdex</h2>
            <div className="mt-3 max-w-xl">
              <div className="mb-1.5 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs">
                <span className="font-semibold text-white">Рівень {level.level}</span>
                <span className="num text-slate-500">
                  {formatChips(level.into)} / {formatChips(level.span)} XP · за рівень {level.level + 1}: +{formatChips(levelUpReward(level.level + 1))}
                </span>
              </div>
              <div className="well h-3 overflow-hidden rounded-full">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-neon-cyan via-neon-emerald to-gold-200 shadow-[0_0_14px_rgba(25,245,163,0.7)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${level.progress * 100}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Усього досвіду: <span className="num">{formatChips(xp)}</span> XP. Досвід нараховується за кожен зіграний раунд.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile index={0} emoji="bullseye" accent="cyan" label="Зіграно раундів" value={formatChips(lifetime.rounds)} hint={`${formatChips(lifetime.wins)} перемог · ${formatChips(lifetime.losses)} поразок`} />
        <StatTile index={1} emoji="chart-increasing" accent="emerald" label="Частка перемог" value={hasDecided(lifetime) ? formatPercent(winRate(lifetime), 1) : '—'} hint={`нічиїх: ${formatChips(lifetime.pushes)}`} />
        <StatTile index={2} emoji="trophy" accent="gold" label="Найбільший виграш" value={lifetime.biggestWin > 0 ? `+${formatChips(lifetime.biggestWin)}` : '—'} hint="чистий прибуток за раунд" />
        <StatTile index={3} emoji="hundred-points" accent="violet" label="Кращий множник" value={lifetime.bestMultiplier ? formatMultiplier(lifetime.bestMultiplier) : '—'} hint={`Краща серія: ${lifetime.bestStreak} ${plural(lifetime.bestStreak, ['перемога', 'перемоги', 'перемог'])}`} />
        <StatTile index={4} emoji="coin" accent="gold" label="Усього поставлено" value={formatChips(lifetime.wagered)} hint={`Повернуто ${formatChips(lifetime.returned)}`} />
        <StatTile index={5} emoji="bar-chart" accent={net >= 0 ? 'emerald' : 'rose'} label="Чистий підсумок" value={formatSigned(net)} hint="за весь час" />
        <StatTile index={6} emoji="wrapped-gift" accent="emerald" label="Бонусні фішки" value={formatChips(lifetime.rewardChips)} hint={`Бонусів: ${lifetime.dailyClaims} · банк: ${lifetime.refills}`} />
        <StatTile index={7} emoji="fire" accent="rose" label="Серія бонусів" value={`${daily.streak} / 7`} hint={`Пік балансу: ${formatChips(lifetime.peakBalance)}`} />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel className="min-w-0 p-4 sm:p-5">
          <SectionTitle>Динаміка балансу</SectionTitle>
          <BalanceChart points={history} />
        </Panel>
        <SettingsPanel />
      </div>

      <Panel className="p-4 sm:p-5">
        <SectionTitle>Статистика за іграми</SectionTitle>
        <GameTable />
      </Panel>

      <Panel className="p-4 sm:p-5">
        <SectionTitle
          action={
            <span className="num inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-gold-300">
              <Award className="size-4" /> {unlocked} / {ACHIEVEMENTS.length}
            </span>
          }
        >
          Досягнення
        </SectionTitle>
        <AchievementGrid />
      </Panel>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-slate-600">
        AXEdex · <SecretCredit />
        <br />
        Іконки: game-icons.net (CC BY 3.0) — Lorc, Delapouite та інші автори. Емблема AXEdex створена на основі «Crossed axes».
      </p>
    </div>
  )
}
