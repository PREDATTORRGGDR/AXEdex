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
    detail: `${TOWER_LEVELS[level].label} · поверх ${floors} · ${formatMultiplier(m)}`,
  }
}

export default function TowerGame() {
  const balance = useCasino((s) => s.balance)
  const [banner, showBanner] = useResultBanner(2600)
  const [scope, animateBoard] = useAnimate<HTMLDivElement>()

  const [bet, setBet] = useState(10)
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
      toast({ kind: 'warning', title: 'Недостатньо фішок' })
      return
    }
    const id = useCasino.getState().startRound('tower', bet, { payout: bet, detail: 'Повернення ставки' })
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
    showBanner({ kind: m >= 10 ? 'bigwin' : 'win', title: floors >= TOWER_FLOORS ? 'Вершину підкорено!' : 'Виграш забрано', amount: s.payout - r.bet, multiplier: m }, { silent: m < 10 })
  }

  const pick = (tile: number) => {
    const r = round.current
    if (!r || !playing) return
    if (traps[floor].includes(tile)) {
      round.current = null
      useCasino.getState().finishRound(r.id, { payout: 0, detail: `${TOWER_LEVELS[r.level].label} · пастка на поверсі ${floor + 1}` })
      setHit({ floor, tile })
      setPhase('busted')
      sfx.play('explosion')
      haptic([60, 40, 80])
      if (scope.current) void animateBoard(scope.current, { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.4 })
      showBanner({ kind: 'lose', title: 'Пастка!', amount: -r.bet }, { silent: true })
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
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
      <Panel strong className="relative overflow-hidden bg-[linear-gradient(180deg,#0b0f16,#07090d)] p-3 sm:p-6 lg:col-start-2 lg:row-start-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(90,184,255,0.14),transparent)]" />
        <div ref={scope} className="relative mx-auto flex max-w-lg flex-col gap-1.5 sm:gap-2">
          <div className="mb-1 flex justify-center">
            <Icon name="tower" size={44} className={cn('transition', phase === 'cashed' && floor >= TOWER_FLOORS && 'animate-bounce')} />
          </div>
          {floorsTopDown.map((f) => {
            const active = playing && f === floor
            const passed = f < floor
            const tiles = cfg.tiles
            return (
              <div key={f} className="flex items-center gap-2">
                <span className={cn('num w-14 shrink-0 text-right text-[11px] font-bold sm:w-16 sm:text-xs', active ? 'text-gold-200' : passed ? 'text-neon-emerald' : 'text-slate-600')}>
                  {formatMultiplier(towerMultiplier(level, f + 1))}
                </span>
                <div className={cn('grid flex-1 gap-1.5 rounded-xl p-1 transition sm:gap-2', active && 'bg-neon-emerald/[0.06] ring-1 ring-neon-emerald/40')} style={{ gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))` }}>
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
                        aria-label={`Поверх ${f + 1}, плита ${t + 1}`}
                        className={cn(
                          'grid h-10 place-items-center rounded-lg border transition-colors sm:h-12',
                          chosen && 'border-neon-emerald/60 bg-neon-emerald/15 shadow-glow-green',
                          isHit && 'border-neon-red/70 bg-neon-red/25',
                          !chosen && !isHit && active && 'border-white/[0.1] bg-[linear-gradient(180deg,#263041,#18202c)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_3px_0_#0a0d13] hover:border-neon-emerald/60 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_3px_0_#0a0d13,0_0_16px_-4px_rgba(25,245,163,0.6)]',
                          !chosen && !isHit && !active && 'border-white/[0.05] bg-white/[0.025]',
                          reveal && isTrap && !isHit && 'bg-[#1a0a0e]',
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

      <Panel strong className="flex flex-col gap-4 p-4 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
        <BetInput value={bet} onChange={setBet} min={1} disabled={playing} />
        <div className="space-y-1.5">
          <p className="eyebrow">Складність</p>
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
            label="Складність"
          />
          <p className="text-[11px] text-slate-500">
            Плит на поверсі: {cfg.tiles}, пасток: {cfg.traps}. Вершина — {formatMultiplier(towerMultiplier(level, TOWER_FLOORS))}.
          </p>
        </div>
        {playing ? (
          <>
            <Button variant="emerald" size="xl" icon={HandCoins} sound={false} disabled={floor === 0} onClick={() => cashOut()}>
              {floor === 0 ? 'Оберіть плиту' : `Забрати ${formatChips(Math.floor(activeBet * towerMultiplier(level, floor)))}`}
            </Button>
            <Button variant="glass" icon={Dices} onClick={() => pick(randomInt(cfg.tiles))}>
              Випадкова плита
            </Button>
          </>
        ) : (
          <Button variant="emerald" size="xl" icon={Play} sound={false} disabled={bet > balance} onClick={start}>
            {phase === 'idle' ? 'Почати сходження' : 'Грати знову'}
          </Button>
        )}
      </Panel>
    </div>
  )
}
