import { Dices, HandCoins, Play } from 'lucide-react'
import { motion, useAnimate } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Panel } from '../../components/ui/Panel'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { useResultBanner } from '../../hooks/useResultBanner'
import { cn } from '../../lib/cn'
import { formatChips, formatMultiplier } from '../../lib/format'
import { randomInt } from '../../lib/rng'
import { useCasino, type Settlement } from '../../store/casino'
import { toast } from '../../store/toasts'
import { buildTower, TOWER_FLOORS, TOWER_LEVELS, towerMultiplier, type TowerLevel } from './logic'

type Phase = 'idle' | 'playing' | 'busted' | 'cashed'

function cashSettlement(bet: number, level: TowerLevel, floors: number): Settlement {
  const m = towerMultiplier(level, floors)
  return {
    payout: Math.floor(bet * m),
    tags: floors >= TOWER_FLOORS ? ['tower-top'] : undefined,
    detail: `${TOWER_LEVELS[level].label} · этаж ${floors} · ${formatMultiplier(m)}`,
  }
}

export default function TowerGame() {
  const balance = useCasino((s) => s.balance)
  const [banner, showBanner] = useResultBanner(2600)
  const [scope, animateBoard] = useAnimate<HTMLDivElement>()

  const [bet, setBet] = useState(100)
  const [level, setLevel] = useState<TowerLevel>('medium')
  const [phase, setPhase] = useState<Phase>('idle')
  const [traps, setTraps] = useState<number[][]>([])
  const [picks, setPicks] = useState<number[]>([])
  const [hit, setHit] = useState<{ floor: number; tile: number } | null>(null)
  const [activeBet, setActiveBet] = useState(0)
  const round = useRef<{ id: string; bet: number; level: TowerLevel } | null>(null)

  const cfg = TOWER_LEVELS[level]
  const floor = picks.length
  const playing = phase === 'playing'
  const finished = phase === 'busted' || phase === 'cashed'

  // Leaving mid-climb cashes out (the wallet fallback always tracks the current floor).
  useEffect(
    () => () => {
      const r = round.current
      if (r) useCasino.getState().finishRound(r.id)
    },
    [],
  )

  const start = () => {
    if (bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостаточно фишек' })
      return
    }
    const id = useCasino.getState().startRound('tower', bet, { payout: bet, detail: 'Возврат ставки' })
    if (!id) return
    round.current = { id, bet, level }
    setActiveBet(bet)
    setTraps(buildTower(level))
    setPicks([])
    setHit(null)
    setPhase('playing')
    sfx.play('whoosh')
  }

  const cashOut = (floors = picks.length) => {
    const r = round.current
    if (!r || floors === 0) return
    round.current = null
    const s = cashSettlement(r.bet, r.level, floors)
    useCasino.getState().finishRound(r.id, s)
    setPhase('cashed')
    const m = towerMultiplier(r.level, floors)
    sfx.play('cashout')
    showBanner({ kind: m >= 10 ? 'bigwin' : 'win', title: floors >= TOWER_FLOORS ? 'Вершина покорена!' : 'Выигрыш забран', amount: s.payout - r.bet, multiplier: m }, { silent: m < 10 })
  }

  const pick = (tile: number) => {
    const r = round.current
    if (!r || !playing) return
    if (traps[floor].includes(tile)) {
      round.current = null
      useCasino.getState().finishRound(r.id, { payout: 0, detail: `${TOWER_LEVELS[r.level].label} · ловушка на этаже ${floor + 1}` })
      setHit({ floor, tile })
      setPhase('busted')
      sfx.play('explosion')
      haptic([60, 40, 80])
      if (scope.current) void animateBoard(scope.current, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.4 })
      showBanner({ kind: 'lose', title: 'Ловушка!', amount: -r.bet }, { silent: true })
      return
    }
    const next = [...picks, tile]
    setPicks(next)
    sfx.play('gem', { pitch: 0.9 + next.length * 0.08 })
    haptic(10)
    if (next.length >= TOWER_FLOORS) {
      cashOut(next.length)
    } else {
      useCasino.getState().setRoundFallback(r.id, cashSettlement(r.bet, r.level, next.length))
    }
  }

  const floorsTopDown = Array.from({ length: TOWER_FLOORS }, (_, i) => TOWER_FLOORS - 1 - i)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel strong className="relative overflow-hidden p-3 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(56,189,248,0.18),transparent)]" />
        <div ref={scope} className="relative mx-auto flex max-w-lg flex-col gap-1.5 sm:gap-2">
          <div className="mb-1 flex justify-center">
            <Icon name="castle" size={44} className={cn('drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)] transition', phase === 'cashed' && floor >= TOWER_FLOORS && 'animate-bounce')} />
          </div>
          {floorsTopDown.map((f) => {
            const active = playing && f === floor
            const passed = f < floor
            const tiles = cfg.tiles
            return (
              <div key={f} className="flex items-center gap-2">
                <span className={cn('w-14 shrink-0 text-right text-[11px] font-bold tabular-nums sm:w-16 sm:text-xs', active ? 'text-gold-200' : passed ? 'text-emerald-300' : 'text-slate-500')}>
                  {formatMultiplier(towerMultiplier(level, f + 1))}
                </span>
                <div className={cn('grid flex-1 gap-1.5 rounded-xl p-1 transition sm:gap-2', active && 'bg-gold-400/10 ring-1 ring-gold-300/50')} style={{ gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))` }}>
                  {Array.from({ length: tiles }, (_, t) => {
                    const chosen = picks[f] === t
                    const isTrap = traps[f]?.includes(t)
                    const reveal = finished && traps.length > 0
                    const isHit = hit?.floor === f && hit.tile === t
                    return (
                      <motion.button
                        key={t}
                        type="button"
                        disabled={!active}
                        onClick={() => pick(t)}
                        whileHover={active ? { y: -2 } : undefined}
                        whileTap={active ? { scale: 0.94 } : undefined}
                        animate={chosen || isHit ? { scale: [0.85, 1.08, 1] } : { scale: 1 }}
                        aria-label={`Этаж ${f + 1}, плита ${t + 1}`}
                        className={cn(
                          'grid h-10 place-items-center rounded-lg border transition-colors sm:h-12',
                          chosen && 'border-emerald-300/60 bg-emerald-400/20 shadow-glow-green',
                          isHit && 'border-rose-300/70 bg-rose-500/30',
                          !chosen && !isHit && active && 'border-gold-300/30 bg-[linear-gradient(180deg,#1e3a5f,#0f1f38)] hover:border-gold-300/70',
                          !chosen && !isHit && !active && 'border-white/10 bg-white/[0.04]',
                          reveal && isTrap && !isHit && 'bg-rose-950/40',
                          !active && !chosen && !isHit && !reveal && passed && 'opacity-60',
                        )}
                      >
                        {chosen && <Icon name="gem-stone" size={24} />}
                        {isHit && <Icon name="skull" size={24} />}
                        {!chosen && !isHit && reveal && (isTrap ? <Icon name="skull" size={20} className="opacity-60" /> : <Icon name="gem-stone" size={18} className="opacity-30" />)}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="flex flex-col gap-4 p-4 lg:self-start">
        <BetInput value={bet} onChange={setBet} min={1} disabled={playing} />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Сложность</p>
          <SegmentedControl
            value={level}
            onChange={(l) => {
              setLevel(l)
              if (!playing) {
                setTraps([])
                setPicks([])
                setHit(null)
              }
            }}
            disabled={playing}
            size="sm"
            options={(Object.keys(TOWER_LEVELS) as TowerLevel[]).map((l) => ({ value: l, label: TOWER_LEVELS[l].label }))}
            label="Сложность"
          />
          <p className="text-[11px] text-slate-500">
            Плит на этаже: {cfg.tiles}, ловушек: {cfg.traps}. Вершина — {formatMultiplier(towerMultiplier(level, TOWER_FLOORS))}.
          </p>
        </div>
        {playing ? (
          <>
            <Button variant="emerald" size="xl" icon={HandCoins} sound={false} disabled={floor === 0} onClick={() => cashOut()}>
              {floor === 0 ? 'Выберите плиту' : `Забрать ${formatChips(Math.floor(activeBet * towerMultiplier(level, floor)))}`}
            </Button>
            <Button variant="glass" icon={Dices} onClick={() => pick(randomInt(cfg.tiles))}>
              Случайная плита
            </Button>
          </>
        ) : (
          <Button variant="gold" size="xl" icon={Play} sound={false} disabled={bet > balance} onClick={start}>
            {phase === 'idle' ? 'Начать восхождение' : 'Играть снова'}
          </Button>
        )}
      </Panel>
    </div>
  )
}
