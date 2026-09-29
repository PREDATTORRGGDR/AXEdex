import { PlaneTakeoff, Repeat, Waves } from 'lucide-react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { haptic, sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { useElementSize } from '../../hooks/useElementSize'
import { useInViewRef } from '../../hooks/useInViewRef'
import { useResultBanner } from '../../hooks/useResultBanner'
import { cn } from '../../lib/cn'
import { formatChips, formatDecimal, formatMultiplier, formatPercent } from '../../lib/format'
import { useCasino, type Settlement } from '../../store/casino'
import { persistStorage, STORAGE_PREFIX } from '../../store/storage'
import { toast } from '../../store/toasts'
import { altitudeAt, BONUS_TABLE, bonusLabel, LAND_CHANCE, payoutFor, planFlight, START_ALTITUDE, type FlightPlan } from './logic'
import { burst, createScene, drawScene, geometry, puff, shipLength, splash, tokenColors, type CarrierScene, type Ship, type Token } from './scene'

type Phase = 'idle' | 'flying' | 'done'
type Tempo = 'normal' | 'fast' | 'turbo'

const STEP_MS: Record<Tempo, number> = { normal: 850, fast: 520, turbo: 300 }
/** Take-off roll and climb, in steps, before the first bonus can be met. */
const PRE_STEPS = 1.6
const LIFTOFF = 1
/** How long the landing or splash plays out after touchdown, in steps (and at least this many ms). */
const OUTRO_STEPS = 1.8
const OUTRO_MIN_MS = 1300

interface Flight {
  roundId: string
  bet: number
  plan: FlightPlan
  stepMs: number
  startAt: number
  /** Index of the next bonus the jet will fly into. */
  next: number
  settled: boolean
  /** Where the jet left the flight path, for the drop into the sea. */
  fall: { y: number; angle: number; splashed: boolean } | null
  /** The flotilla in world coordinates (stern x before any travel). */
  ships: Ship[]
  /** Index of the ship the jet takes off from and of the one it lands on (or misses). */
  home: number
  final: number
  /** Carrier travel per step, px. */
  vc: number
}

interface HistoryItem {
  id: number
  counter: number
  landed: boolean
}

const useCarrierHistory = create<{ items: HistoryItem[]; push: (h: HistoryItem) => void }>()(
  persist((set) => ({ items: [], push: (h) => set((s) => ({ items: [h, ...s.items].slice(0, 24) })) }), {
    name: `${STORAGE_PREFIX}:carrier`,
    storage: persistStorage,
  }),
)

function settlementFor(bet: number, plan: FlightPlan): Settlement {
  return {
    payout: payoutFor(bet, plan),
    tags: plan.landed && plan.counter >= 10 ? ['carrier-10'] : undefined,
    detail: plan.landed ? `Посадка на крейсер · ${formatMultiplier(plan.counter)}` : `Упав у море · ${formatMultiplier(plan.counter)}`,
  }
}

const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2)

/** How far the flotilla has drifted left (px) at step-time `st`. */
function travel(st: number, touchdown: number, vc: number): number {
  if (st <= -PRE_STEPS) return 0
  if (st < 0) return (vc * (st + PRE_STEPS) ** 2) / (2 * PRE_STEPS)
  const base = (vc * PRE_STEPS) / 2
  if (st <= touchdown) return base + vc * st
  const u = Math.min(st - touchdown, 0.8)
  return base + vc * (touchdown + u - (u * u) / 1.6)
}

/**
 * An endless-looking flotilla of ships of every size along the route: the
 * jet launches from one, flies over the rest and at touchdown is either over
 * the deck of the last one or over open water between two of them.
 */
const baseVc = (w: number) => w * 0.3 * 0.8

/** The ship the jet waits on before take-off, placed exactly where the next flight starts. */
function idleHome(w: number, h: number, len: number): Ship {
  const g = geometry(w, h)
  const vc = baseVc(w)
  return { x: g.planeX - len + travel(LIFTOFF - PRE_STEPS, 1, vc) - travel(-PRE_STEPS, 1, vc), len }
}

function planFleet(plan: FlightPlan, w: number, h: number, homeLen: number): Pick<Flight, 'ships' | 'home' | 'final' | 'vc'> {
  const g = geometry(w, h)
  let vc = baseVc(w)
  let result: Pick<Flight, 'ships' | 'home' | 'final' | 'vc'> | null = null
  for (let attempt = 0; attempt < 8 && !result; attempt++, vc *= 1.2) {
    const home: Ship = { x: 0, len: homeLen }
    home.x = g.planeX - home.len + travel(LIFTOFF - PRE_STEPS, plan.touchdown, vc)
    const reach = travel(plan.touchdown, plan.touchdown, vc)
    const fin: Ship = { x: 0, len: shipLength(g.length) }
    const fixed: Ship[] = []
    if (plan.landed) {
      fin.x = g.planeX - g.zoneCenter(fin.len) + reach
      fixed.push(fin)
    } else {
      const gap = g.minGap * (1.15 + Math.random() * 0.5)
      fin.x = g.planeX + gap * 0.62 + reach
      const prev: Ship = { x: 0, len: shipLength(g.length) }
      prev.x = fin.x - gap - prev.len
      fixed.push(prev, fin)
    }
    const firstStern = fixed[0].x
    const fillers: Ship[] = []
    let cursor = home.x + home.len
    for (;;) {
      const gap = g.minGap * (1 + Math.random() * 0.7)
      const len = shipLength(g.length)
      if (cursor + gap + len + g.minGap * 1.2 > firstStern) break
      fillers.push({ x: cursor + gap, len })
      cursor += gap + len
    }
    if (firstStern - cursor < g.minGap) continue
    // Share the spare water between the gaps so none is oddly wide.
    const spare = firstStern - cursor - g.minGap * 1.3
    if (spare > 0) fillers.forEach((f, i) => (f.x += (spare * (i + 1)) / (fillers.length + 1)))
    const before: Ship[] = []
    let left = home.x
    for (let i = 0; i < 3; i++) {
      const len = shipLength(g.length)
      left -= g.minGap * (1 + Math.random() * 0.7) + len
      before.unshift({ x: left, len })
    }
    const after: Ship[] = []
    let right = fin.x + fin.len
    for (let i = 0; i < 5; i++) {
      right += g.minGap * (1 + Math.random() * 0.7)
      const len = shipLength(g.length)
      after.push({ x: right, len })
      right += len
    }
    const ships = [...before, home, ...fillers, ...fixed, ...after]
    result = { ships, home: before.length, final: ships.indexOf(fin), vc }
  }
  return result!
}

/** Unique bonus kinds for the legend, in table order. */
const LEGEND = BONUS_TABLE.map((b) => ({ b, label: bonusLabel(b) }))

export default function CarrierGame() {
  const balance = useCasino((s) => s.balance)
  const { items: history, push } = useCarrierHistory()
  const [wrapRef, { width }] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inView = useInViewRef(canvasRef)
  const [shakeScope, shake] = useAnimate<HTMLDivElement>()
  const [banner, showBanner] = useResultBanner(2600)

  const [bet, setBet] = useState(10)
  const [tempo, setTempo] = useState<Tempo>('normal')
  const [phase, setPhase] = useState<Phase>('idle')
  const [counter, setCounter] = useState(1)
  const [status, setStatus] = useState<'idle' | 'takeoff' | 'flight' | 'carrier' | 'landed' | 'sea'>('idle')
  const [flightBet, setFlightBet] = useState(0)
  const [autoLeft, setAutoLeft] = useState(0)

  const flight = useRef<Flight | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const height = width < 640 ? 300 : 400
  const scene = useRef<CarrierScene | null>(null)
  /** Length of the ship the next flight launches from (so the idle scene matches it). */
  const nextHome = useRef(0)

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  // Everything the render loop needs to call without restarting itself.
  const handlers = useRef({
    onBonus: (_counter: number, _kind: string) => {},
    onTouchdown: (_f: Flight) => {},
    onDone: () => {},
    setStatus: (_s: typeof status) => {},
  })
  useEffect(() => {
    handlers.current = {
      setStatus,
      onBonus: (next, kind) => {
        setCounter(next)
        if (kind === 'rocket') {
          sfx.play('explosion', { pitch: 1.5 })
          haptic([30, 20, 40])
          if (shakeScope.current) void shake(shakeScope.current, { x: [0, -6, 5, -3, 0] }, { duration: 0.35 })
        } else {
          sfx.play(kind === 'mul' ? 'bonus' : 'gem', { pitch: kind === 'mul' ? 1 : 0.9 + Math.random() * 0.3 })
          haptic(12)
        }
      },
      onTouchdown: (f) => {
        if (f.settled) return
        f.settled = true
        const s = settlementFor(f.bet, f.plan)
        useCasino.getState().finishRound(f.roundId, s)
        push({ id: Date.now(), counter: f.plan.counter, landed: f.plan.landed })
        if (f.plan.landed) {
          setStatus('landed')
          const win = s.payout
          showBanner(
            {
              kind: win >= f.bet * 10 ? 'bigwin' : win > f.bet ? 'win' : win === f.bet ? 'push' : 'lose',
              title: win >= f.bet ? 'Посадка вдала!' : 'Посадка з втратою',
              amount: win - f.bet,
              multiplier: f.plan.counter,
            },
            { silent: true },
          )
          sfx.play(win >= f.bet * 10 ? 'bigWin' : win > f.bet ? 'cashout' : 'push')
          haptic([20, 30, 20])
        } else {
          setStatus('sea')
          showBanner({ kind: 'lose', title: 'Літак упав у море', amount: -f.bet, subtitle: `Було зібрано ${formatMultiplier(f.plan.counter)}` }, { silent: true })
          sfx.play('lose')
          haptic([60, 40, 80])
        }
      },
      onDone: () => {
        flight.current = null
        phaseRef.current = 'done'
        setPhase('done')
      },
    }
  }, [push, showBanner, shake, shakeScope])

  // Render loop.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')!
    if (!scene.current || scene.current.w !== width || scene.current.h !== height) {
      if (!nextHome.current) nextHome.current = shipLength(geometry(width, height).length)
      scene.current = createScene(width, height, idleHome(width, height, nextHome.current))
    }
    const g = geometry(width, height)
    const V = width * 0.3
    let raf = 0
    let last = performance.now()
    let lastPuff = 0
    let lastStatus = ''

    const altY = (alt: number, visible: number) => {
      const top = height * 0.12
      const deck = g.deckY - g.rideHeight
      return deck - Math.min(alt, visible) * ((deck - top) / visible)
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const f = flight.current
      const s = scene.current!
      const live = !!f || s.particles.length > 0 || s.popups.length > 0
      if (!live && (!inView.current || now - last < 33)) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const tokens: Token[] = []

      if (f) {
        const { plan } = f
        const stepS = f.stepMs / 1000
        const st = (now - f.startAt) / f.stepMs - PRE_STEPS
        const maxAlt = Math.max(START_ALTITUDE, ...plan.altitudes.map((a, i) => a + Math.max(0, plan.lifts[i])))
        const visible = Math.min(12, Math.max(6, maxAlt + 0.6))
        const setS = (v: typeof lastStatus) => {
          if (v !== lastStatus) {
            lastStatus = v
            handlers.current.setStatus(v as never)
          }
        }

        // World scroll speed (px/s): ramps up on take-off, eases to a stop after touchdown.
        let speedFactor = 1
        if (st < 0) speedFactor = Math.min(1, (st + PRE_STEPS) / PRE_STEPS)
        const after = st - plan.touchdown
        if (after > 0) speedFactor = Math.max(0, 1 - after / 0.8)
        s.speed = (V / stepS) * speedFactor

        // The flotilla drifts past; the target ship's deck lights up on approach.
        const drift = travel(st, plan.touchdown, f.vc)
        s.fleet = f.ships.map((sh) => ({ x: sh.x - drift, len: sh.len }))
        s.focus = f.final
        s.zoneGlow = Math.max(0, Math.min(1, 1 - (plan.touchdown - st) / 1.5))
        const home = s.fleet[f.home]
        const fin = s.fleet[f.final]

        // Jet pose.
        let alt: number
        if (st < 0) {
          const tau = st + PRE_STEPS
          alt = tau < LIFTOFF ? 0 : START_ALTITUDE * easeInOut(Math.min(1, (tau - LIFTOFF) / (PRE_STEPS - LIFTOFF)))
          s.plane.flame = 0.3 + 0.7 * Math.min(1, tau / LIFTOFF)
          if (tau < LIFTOFF && Math.random() < 0.5) {
            s.particles.push({ x: s.plane.x - 20 * g.scale, y: g.deckY - 4, vx: -60 - Math.random() * 60, vy: -Math.random() * 20, life: 0.5, max: 0.5, size: 2.5 * g.scale, color: 'rgba(220,240,255,0.5)' })
          }
          setS('takeoff')
        } else {
          alt = altitudeAt(plan, Math.min(st, plan.touchdown))
          s.plane.flame = after > 0 ? Math.max(0, s.plane.flame - dt * 2) : 0.55
          if (after <= 0) setS(plan.touchdown - st < 1.3 ? 'carrier' : 'flight')
        }
        const y = altY(alt, visible)
        const ahead = altY(st < 0 ? alt : altitudeAt(plan, Math.min(st + 0.05, plan.touchdown)), visible)
        const wobble = after > 0 || st < 0 ? 0 : Math.sin(s.t * 2.3) * 1.2 + Math.sin(s.t * 5.1 + 1) * 0.6
        s.plane.hook = st > plan.touchdown - 0.6

        const rolling = st < 0 && st + PRE_STEPS < LIFTOFF
        if (after <= 0) {
          // Catapult run along the home ship's deck, then the flight path.
          const tau = st + PRE_STEPS
          s.plane.x = rolling ? home.x + home.len * (0.3 + 0.7 * (tau / LIFTOFF) ** 2) : g.planeX
          s.plane.y = y + wobble
          s.plane.angle = rolling ? 0 : Math.atan2(ahead - y, V * 0.05) * 0.8
        } else if (plan.landed) {
          // Rolls out on the deck and stops on the wires.
          const roll = fin.len * 0.1 * (1 - Math.exp(-after * 3))
          s.plane.x = fin.x + g.zoneCenter(fin.len) + roll
          s.plane.y = g.deckY - g.rideHeight
          s.plane.angle *= 0.85
        } else {
          // Drops into open water between two ships.
          if (!f.fall) f.fall = { y: s.plane.y, angle: s.plane.angle, splashed: false }
          const fall = f.fall
          if (!fall.splashed) {
            const p = Math.min(1, after / 0.3)
            s.plane.x = g.planeX + width * 0.04 * p
            s.plane.y = fall.y + (g.seaY - fall.y) * p * p
            s.plane.angle = fall.angle + p * 1
            if (p >= 1) {
              fall.splashed = true
              s.plane.visible = false
              splash(s, s.plane.x)
            }
          }
        }

        // Bonuses the jet meets, in order.
        while (f.next < plan.events.length && plan.events[f.next].step <= st) {
          const e = plan.events[f.next]
          f.next++
          const [, color] = tokenColors(e.bonus)
          burst(s, s.plane.x + 10, s.plane.y, color, e.bonus.kind === 'rocket' ? 26 : 16, e.bonus.kind === 'rocket' ? 160 : 110)
          s.popups.push({ x: s.plane.x + 8, y: s.plane.y - 22 * g.scale, text: bonusLabel(e.bonus), color, life: 1.1 })
          handlers.current.onBonus(e.counterAfter, e.bonus.kind)
        }
        for (let i = f.next; i < plan.events.length; i++) {
          const e = plan.events[i]
          const rush = e.bonus.kind === 'rocket' ? 1.7 : 1
          tokens.push({ x: g.planeX + (e.step - st) * V * rush, y: altY(e.altitude, visible), bonus: e.bonus })
        }
        for (const d of plan.decoys) {
          const rush = d.bonus.kind === 'rocket' ? 1.7 : 1
          const x = g.planeX + (d.step - st) * V * rush
          if (x > -40) tokens.push({ x, y: altY(d.altitude, visible), bonus: d.bonus })
        }

        if (after <= 0 && st >= 0 && now - lastPuff > 45) {
          lastPuff = now
          puff(s)
        }
        if (after >= 0 && !f.settled) handlers.current.onTouchdown(f)
        if (after > 0 && now - f.startAt > (plan.touchdown + PRE_STEPS + OUTRO_STEPS) * f.stepMs && now - f.startAt > (plan.touchdown + PRE_STEPS) * f.stepMs + OUTRO_MIN_MS) {
          handlers.current.onDone()
        }
      } else {
        // Between flights the sea keeps moving and the jet idles on deck (or the landing carrier).
        s.speed = 0
        if (phaseRef.current === 'idle') {
          s.plane.y = g.deckY - g.rideHeight + Math.sin(s.t * 1.4) * 0.6
          s.plane.flame = 0.15
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawScene(ctx, s, dt, tokens, bonusLabel)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [width, height, inView, shake, shakeScope])

  // Leaving mid-flight settles with the outcome already drawn at take-off.
  useEffect(
    () => () => {
      const f = flight.current
      if (f && !f.settled) useCasino.getState().finishRound(f.roundId)
      flight.current = null
    },
    [],
  )

  const launch = useCallback(() => {
    if (phaseRef.current === 'flying') return
    const b = bet
    if (b > useCasino.getState().balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостатньо фішок', message: 'Зменште ставку або заберіть бонус.' })
      setAutoLeft(0)
      return
    }
    const plan = planFlight()
    const roundId = useCasino.getState().startRound('carrier', b, settlementFor(b, plan))
    if (!roundId) {
      sfx.play('error')
      setAutoLeft(0)
      return
    }
    const w = scene.current?.w ?? width
    const h = scene.current?.h ?? height
    const homeLen = nextHome.current || shipLength(geometry(w, h).length)
    scene.current = createScene(w, h, idleHome(w, h, homeLen))
    flight.current = { roundId, bet: b, plan, stepMs: STEP_MS[tempo], startAt: performance.now(), next: 0, settled: false, fall: null, ...planFleet(plan, w, h, homeLen) }
    nextHome.current = shipLength(geometry(w, h).length)
    setCounter(1)
    setFlightBet(b)
    setStatus('takeoff')
    setPhaseBoth('flying')
    sfx.play('launch')
  }, [bet, tempo, width, height])

  // Autoplay: the next flight starts shortly after the previous one ends.
  useEffect(() => {
    if (phase !== 'done' || autoLeft <= 0) return
    const t = window.setTimeout(() => {
      setAutoLeft((n) => n - 1)
      launch()
    }, 900)
    return () => window.clearTimeout(t)
  }, [phase, autoLeft, launch])

  // Space launches the next flight.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phaseRef.current !== 'flying' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        launch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [launch])

  const flying = phase === 'flying'
  const stake = flying || phase === 'done' ? flightBet : bet
  const STATUS: Record<typeof status, { text: string; tone: string }> = {
    idle: { text: 'На палубі', tone: 'text-slate-400 ring-white/10' },
    takeoff: { text: 'Зліт', tone: 'text-neon-cyan ring-neon-cyan/30' },
    flight: { text: 'Політ', tone: 'text-neon-emerald ring-neon-emerald/30' },
    carrier: { text: 'Захід на посадку', tone: 'text-gold-200 ring-gold-300/40' },
    landed: { text: 'Посадка', tone: 'text-neon-emerald ring-neon-emerald/40' },
    sea: { text: 'У морі', tone: 'text-neon-red ring-neon-red/40' },
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 space-y-3 sm:space-y-4 lg:col-start-2 lg:row-start-1">
        <Panel strong className="relative overflow-hidden bg-[linear-gradient(180deg,#0b0f16,#07090d)] p-0">
          <div ref={shakeScope} className="relative">
            <div ref={wrapRef} className="relative w-full" style={{ height }}>
              <canvas ref={canvasRef} className="absolute inset-0" role="img" aria-label="Політ літака над морем" />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
                <span className={cn('rounded-md bg-ink-950/75 px-2 py-1 text-[10px] font-bold tracking-[0.16em] uppercase ring-1', STATUS[status].tone)}>
                  {STATUS[status].text}
                </span>
                <div className="text-right">
                  <motion.p
                    key={counter}
                    initial={{ scale: 1.25 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className={cn(
                      'num origin-right text-3xl leading-none font-bold sm:text-5xl',
                      status === 'sea' ? 'text-neon-red' : status === 'landed' ? 'text-emerald-gradient' : 'text-white [text-shadow:0_0_24px_rgba(34,225,255,0.55)]',
                    )}
                  >
                    {formatMultiplier(counter)}
                  </motion.p>
                  <p className="num mt-1 text-xs text-slate-400 sm:text-sm">
                    = {formatChips(Math.floor(stake * counter))} <span className="text-slate-600">фішок</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <ResultBanner result={banner} />
        </Panel>

        <Panel className="flex items-center gap-3 overflow-hidden p-3">
          <span className="eyebrow shrink-0">Польоти</span>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {history.length === 0 && <span className="text-xs text-slate-500">Тут з’являться ваші польоти</span>}
            <AnimatePresence initial={false}>
              {history.map((h) => (
                <motion.span
                  key={h.id}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'num flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ring-1',
                    h.landed ? 'bg-neon-emerald/10 text-neon-emerald ring-neon-emerald/30' : 'bg-white/[0.03] text-slate-500 line-through ring-white/10',
                  )}
                  title={h.landed ? 'Посадка на крейсер' : 'Упав у море'}
                >
                  {!h.landed && <Waves className="size-3 shrink-0 no-underline" />}
                  {formatMultiplier(h.counter)}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </Panel>
      </div>

      <Panel strong className="flex flex-col gap-4 p-4 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
        <BetInput value={bet} onChange={setBet} min={1} disabled={flying} />
        <div className="space-y-1.5">
          <p className="eyebrow">Темп польоту</p>
          <SegmentedControl
            size="sm"
            value={tempo}
            onChange={setTempo}
            disabled={flying}
            label="Темп польоту"
            options={[
              { value: 'normal', label: 'Звичайний' },
              { value: 'fast', label: 'Швидкий' },
              { value: 'turbo', label: 'Турбо' },
            ]}
          />
        </div>
        <Button variant="emerald" size="xl" icon={PlaneTakeoff} sound={false} disabled={flying || bet > balance} onClick={launch}>
          {flying ? 'У польоті…' : `Зліт · ${formatChips(bet)}`}
        </Button>
        <Button variant={autoLeft > 0 ? 'violet' : 'glass'} icon={Repeat} onClick={() => setAutoLeft((n) => (n > 0 ? 0 : 10))} aria-pressed={autoLeft > 0}>
          {autoLeft > 0 ? `Зупинити автополіт (${autoLeft})` : 'Автополіт ×10'}
        </Button>

        <div className="space-y-2">
          <p className="eyebrow">Бонуси в небі</p>
          <div className="grid grid-cols-3 gap-1.5">
            {LEGEND.map(({ b, label }) => {
              const [light, base] = tokenColors(b)
              return (
                <span
                  key={label}
                  className="num flex h-8 items-center justify-center rounded-lg text-[12px] font-bold"
                  style={{ color: b.kind === 'rocket' ? light : '#07090d', background: b.kind === 'rocket' ? 'rgba(255,77,109,0.12)' : `radial-gradient(circle at 35% 30%, ${light}, ${base})`, boxShadow: `0 0 14px -4px ${base}` }}
                >
                  {b.kind === 'rocket' ? `Ракета ${label}` : label}
                </span>
              )
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Бонуси підкидають літак угору: що більший «ікс», то вище. Ракета ділить виграш навпіл і збиває висоту. Шанс сісти на крейсер —{' '}
            <b className="num text-slate-300">{formatPercent(LAND_CHANCE)}</b>.
          </p>
        </div>
        <p className="text-center text-[11px] text-slate-500">
          Пробіл — зліт · RTP <span className="num">{formatDecimal(96.7, 1)}%</span>
        </p>
      </Panel>
    </div>
  )
}
