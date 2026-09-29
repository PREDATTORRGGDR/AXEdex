import { HandCoins, Rocket } from 'lucide-react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { haptic, sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { useElementSize } from '../../hooks/useElementSize'
import { useInViewRef } from '../../hooks/useInViewRef'
import { useResultBanner } from '../../hooks/useResultBanner'
import { wait } from '../../lib/async'
import { cn } from '../../lib/cn'
import { formatChips, formatDecimal, formatMultiplier } from '../../lib/format'
import { useCasino, type Settlement } from '../../store/casino'
import { persistStorage, STORAGE_PREFIX } from '../../store/storage'
import { crashPoint, GROWTH, multiplierAt, payoutFor } from './logic'
import { createStars, drawScene, explode, type SceneState } from './scene'

type Phase = 'idle' | 'countdown' | 'flying' | 'crashed'

interface Flight {
  roundId: string
  bet: number
  crash: number
  auto: number | null
  startAt: number
  cashedAt: number | null
}

const useCrashHistory = create<{ points: number[]; push: (p: number) => void }>()(
  persist((set) => ({ points: [], push: (p) => set((s) => ({ points: [p, ...s.points].slice(0, 30) })) }), {
    name: `${STORAGE_PREFIX}:crash`,
    storage: persistStorage,
  }),
)

const AUTO_PRESETS = [1.5, 2, 3, 5, 10]

function settlementFor(bet: number, multiplier: number): Settlement {
  return {
    payout: payoutFor(bet, multiplier),
    tags: multiplier >= 10 ? ['crash-10x'] : undefined,
    detail: `Забрал на ${formatMultiplier(multiplier)}`,
  }
}

function pillClass(p: number) {
  if (p >= 10) return 'bg-gold-400/20 text-gold-200 ring-gold-300/40'
  if (p >= 2) return 'bg-emerald-400/15 text-emerald-300 ring-emerald-300/30'
  return 'bg-rose-500/15 text-rose-300 ring-rose-400/30'
}

export default function CrashGame() {
  const balance = useCasino((s) => s.balance)
  const { points, push } = useCrashHistory()
  const [wrapRef, { width }] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inView = useInViewRef(canvasRef)
  const rocketRef = useRef<HTMLDivElement>(null)
  const multRef = useRef<HTMLParagraphElement>(null)
  const [shakeScope, shake] = useAnimate<HTMLDivElement>()
  const [banner, showBanner] = useResultBanner(2800)

  const [bet, setBet] = useState(10)
  const [autoOn, setAutoOn] = useState(false)
  const [autoValue, setAutoValue] = useState(2)
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(0)
  const [liveMult, setLiveMult] = useState(1)
  const [cashed, setCashed] = useState<number | null>(null)
  const [lastCrash, setLastCrash] = useState<number | null>(null)
  const [flightBet, setFlightBet] = useState(0)

  const flight = useRef<Flight | null>(null)
  const scene = useRef<SceneState>({ t: 0, m: 1, crashed: false, cashedAt: null, trail: [], sparks: [], stars: createStars() })
  const phaseRef = useRef<Phase>('idle')
  const height = width < 640 ? 300 : 380

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const cashOut = useCallback(
    (at?: number) => {
      const f = flight.current
      if (!f || f.cashedAt || phaseRef.current !== 'flying') return
      const m = at ?? multiplierAt(performance.now() - f.startAt)
      if (m >= f.crash) return
      f.cashedAt = m
      scene.current.cashedAt = m
      setCashed(m)
      useCasino.getState().finishRound(f.roundId, settlementFor(f.bet, m))
      sfx.play('cashout')
      haptic([20, 30, 20])
      const win = payoutFor(f.bet, m)
      showBanner({ kind: m >= 10 ? 'bigwin' : 'win', title: `Забрано на ${formatMultiplier(m)}`, amount: win - f.bet, multiplier: m }, { silent: true })
      if (m >= 10) sfx.play('bigWin')
    },
    [showBanner],
  )

  // Render loop: always running so the idle scene twinkles too.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()
    let lastUi = 0
    let lastWhole = 1

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const f = flight.current
      const s = scene.current
      const live = (f && phaseRef.current === 'flying') || s.sparks.length > 0 || s.trail.length > 0
      // Between rounds only the stars drift: 30 fps is enough, and nothing draws off screen.
      if (!live && (!inView.current || now - last < 33)) return
      const dt = Math.min(3, (now - last) / 16.67)
      last = now

      if (f && phaseRef.current === 'flying') {
        const elapsed = now - f.startAt
        let m = multiplierAt(elapsed)
        if (f.auto && !f.cashedAt && m >= f.auto && f.auto < f.crash) cashOut(f.auto)
        if (m >= f.crash) {
          m = f.crash
          s.t = Math.log(f.crash) / GROWTH
          s.m = m
          s.crashed = true
          phaseRef.current = 'crashed'
          setPhase('crashed')
          setLastCrash(f.crash)
          push(f.crash)
          sfx.play('explosion')
          haptic([60, 40, 80])
          if (shakeScope.current) void shake(shakeScope.current, { x: [0, -10, 9, -7, 6, -3, 0], y: [0, 5, -4, 3, -2, 0] }, { duration: 0.5 })
          if (!f.cashedAt) {
            useCasino.getState().finishRound(f.roundId, { payout: 0, detail: `Взрыв на ${formatMultiplier(f.crash)}` })
            showBanner({ kind: 'lose', title: `Взрыв на ${formatMultiplier(f.crash)}`, amount: -f.bet }, { silent: true })
          }
          flight.current = null
          const tip = drawScene(ctx, width, height, s, dt)
          explode(s, tip.x, tip.y)
        } else {
          s.t = elapsed / 1000
          s.m = m
          const whole = Math.floor(m)
          if (whole > lastWhole) {
            lastWhole = whole
            sfx.play('ping', { pitch: Math.min(2, 0.8 + whole * 0.08) })
          }
        }
        if (now - lastUi > 70) {
          lastUi = now
          setLiveMult(s.m)
        }
      } else {
        lastWhole = 1
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const tip = drawScene(ctx, width, height, s, dt)

      if (rocketRef.current) {
        const idle = phaseRef.current === 'idle' || phaseRef.current === 'countdown'
        const bob = idle ? Math.sin(now / 300) * 3 : 0
        rocketRef.current.style.transform = `translate(${tip.x - 18}px, ${tip.y - 18 + bob}px) rotate(${tip.angle + Math.PI / 4}rad)`
        rocketRef.current.style.opacity = s.crashed ? '0' : '1'
      }
      if (multRef.current) multRef.current.textContent = `${formatDecimal(s.m)}×`
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [width, height, cashOut, push, shake, shakeScope, showBanner, inView])

  // Leaving mid-flight cashes out at the current multiplier (if still alive).
  useEffect(
    () => () => {
      const f = flight.current
      if (!f || f.cashedAt) return
      const m = phaseRef.current === 'flying' ? multiplierAt(performance.now() - f.startAt) : 1
      useCasino.getState().finishRound(f.roundId, m < f.crash ? settlementFor(f.bet, m) : { payout: 0 })
      flight.current = null
    },
    [],
  )

  // Space bar cashes out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phaseRef.current === 'flying' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        cashOut()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cashOut])

  const launch = async () => {
    if (phaseRef.current === 'countdown' || phaseRef.current === 'flying') return
    const crash = crashPoint()
    const auto = autoOn && autoValue >= 1.01 ? Math.round(autoValue * 100) / 100 : null
    // If the tab dies mid-flight, settle as the auto cash-out would have.
    const fallback: Settlement = auto && auto < crash ? settlementFor(bet, auto) : { payout: 0, detail: `Взрыв на ${formatMultiplier(crash)}` }
    const roundId = useCasino.getState().startRound('crash', bet, fallback)
    if (!roundId) {
      sfx.play('error')
      return
    }
    flight.current = { roundId, bet, crash, auto, startAt: 0, cashedAt: null }
    scene.current = { ...scene.current, t: 0, m: 1, crashed: false, cashedAt: null, trail: [], sparks: [] }
    setCashed(null)
    setLiveMult(1)
    setFlightBet(bet)
    setPhaseBoth('countdown')
    for (const n of [3, 2, 1]) {
      setCountdown(n)
      sfx.play('tick', { pitch: 0.6 })
      await wait(450)
      if (!flight.current) return
    }
    setCountdown(0)
    sfx.play('launch')
    flight.current.startAt = performance.now()
    setPhaseBoth('flying')
  }

  const flying = phase === 'flying'
  const livePayout = payoutFor(flightBet, liveMult)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-3">
        <Panel strong className="relative overflow-hidden p-0">
          <div ref={shakeScope} className="relative">
            <div ref={wrapRef} className="relative w-full bg-[radial-gradient(120%_100%_at_0%_100%,rgba(34,211,238,0.12),transparent_60%),radial-gradient(100%_80%_at_100%_0%,rgba(167,139,250,0.14),transparent_60%)]" style={{ height }}>
              <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />
              <div ref={rocketRef} className="pointer-events-none absolute top-0 left-0 will-change-transform">
                <Rocket className="size-9 fill-cyan-200/30 text-white drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]" strokeWidth={1.8} />
              </div>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p
                    ref={multRef}
                    className={cn(
                      'font-display text-5xl font-black tabular-nums transition-colors sm:text-7xl',
                      phase === 'crashed' ? 'text-rose-400 [text-shadow:0_0_30px_rgba(255,77,109,0.7)]' : cashed ? 'text-emerald-300 text-glow-green' : 'text-white [text-shadow:0_0_30px_rgba(34,211,238,0.6)]',
                    )}
                  >
                    1,00×
                  </p>
                  <p className="mt-1 text-xs font-bold tracking-[0.25em] text-slate-400 uppercase">
                    {phase === 'idle' && 'Ракета на стартовой площадке'}
                    {phase === 'countdown' && 'Предстартовый отсчёт'}
                    {phase === 'flying' && (cashed ? `Вы забрали на ${formatMultiplier(cashed)}` : 'Полёт…')}
                    {phase === 'crashed' && lastCrash !== null && `Взрыв на ${formatMultiplier(lastCrash)}`}
                  </p>
                </div>
              </div>
              <AnimatePresence>
                {countdown > 0 && (
                  <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="absolute inset-0 grid place-items-center bg-ink-950/40">
                    <span className="font-display text-8xl font-black text-gold-gradient">{countdown}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <ResultBanner result={banner} className="items-start pt-6" />
        </Panel>

        <Panel className="flex items-center gap-3 overflow-hidden p-3">
          <span className="shrink-0 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">История</span>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {points.length === 0 && <span className="text-xs text-slate-500">Здесь появятся последние взлёты</span>}
            <AnimatePresence initial={false}>
              {points.slice(0, 20).map((p, i) => (
                <motion.span
                  key={points.length - i}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn('shrink-0 rounded-lg px-2 py-1 text-xs font-bold tabular-nums ring-1', pillClass(p))}
                >
                  {formatMultiplier(p)}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </Panel>
      </div>

      <Panel strong className="flex flex-col gap-4 p-4 lg:self-start">
        <BetInput value={bet} onChange={setBet} min={1} disabled={phase === 'countdown' || flying} />

        <div className="space-y-2">
          <label className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Автовывод</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoOn}
              disabled={phase === 'countdown' || flying}
              onClick={() => (sfx.play('click'), setAutoOn((v) => !v))}
              className={cn('relative h-6 w-11 rounded-full transition-colors disabled:opacity-50', autoOn ? 'bg-emerald-400' : 'bg-white/10')}
            >
              <motion.span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white" animate={{ x: autoOn ? 20 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 32 }} />
            </button>
          </label>
          <div className={cn('flex items-center gap-2 transition-opacity', !autoOn && 'opacity-40')}>
            <input
              type="number"
              min={1.01}
              step={0.1}
              value={autoValue}
              disabled={!autoOn || phase === 'countdown' || flying}
              onChange={(e) => setAutoValue(Math.max(1.01, Number(e.target.value) || 1.01))}
              className="h-10 w-24 rounded-xl border border-white/10 bg-ink-950/60 px-3 text-sm font-bold text-white tabular-nums outline-none focus:border-gold-400/60"
              aria-label="Множитель автовывода"
            />
            <div className="flex flex-1 flex-wrap gap-1">
              {AUTO_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={!autoOn || phase === 'countdown' || flying}
                  onClick={() => setAutoValue(p)}
                  className={cn('h-8 rounded-lg px-2 text-xs font-bold transition', autoValue === p ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/[0.05] text-slate-300 hover:bg-white/10')}
                >
                  {formatDecimal(p, p % 1 ? 1 : 0)}×
                </button>
              ))}
            </div>
          </div>
        </div>

        {flying && !cashed ? (
          <Button variant="emerald" size="xl" icon={HandCoins} sound={false} onClick={() => cashOut()} className="animate-[pulse-glow_1.2s_ease-in-out_infinite]">
            Забрать {formatChips(livePayout)}
          </Button>
        ) : (
          <Button variant="gold" size="xl" icon={Rocket} sound={false} disabled={phase === 'countdown' || flying || bet > balance} onClick={() => void launch()}>
            {phase === 'countdown' ? 'Старт…' : flying ? 'Выигрыш получен' : phase === 'crashed' ? 'Запустить снова' : 'Запустить ракету'}
          </Button>
        )}
        <p className="text-center text-[11px] text-slate-500">Пробел — забрать выигрыш во время полёта</p>
      </Panel>
    </div>
  )
}
