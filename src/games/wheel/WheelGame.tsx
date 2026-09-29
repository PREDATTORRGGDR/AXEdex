import { Aperture } from 'lucide-react'
import { animate, motion, useMotionValue, useMotionValueEvent, useAnimate } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { useMountedRef } from '../../hooks/useMounted'
import { useResultBanner } from '../../hooks/useResultBanner'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { useSvgId } from '../../hooks/useSvgId'
import { cn } from '../../lib/cn'
import { formatDecimal, formatPercent } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { toast } from '../../store/toasts'
import { segmentAngles, segmentsFor, spinWheel, WHEEL_RISK_LABELS, type Segment, type WheelRisk } from './logic'

const SIZE = 400
const C = SIZE / 2
const R = 176

function colorFor(s: Segment): string {
  if (s.jackpot) return 'url(#JACKPOT)'
  if (s.multiplier === 0) return '#1b2340'
  if (s.multiplier < 1.5) return '#0d9488'
  if (s.multiplier < 2) return '#10b981'
  if (s.multiplier < 3) return '#0891b2'
  if (s.multiplier < 4) return '#7c3aed'
  if (s.multiplier < 10) return '#db2777'
  return '#ea580c'
}

function chipColor(m: number, jackpot?: boolean) {
  if (jackpot) return 'bg-gold-300 text-ink-950'
  if (m === 0) return 'bg-slate-700 text-slate-200'
  if (m < 1.5) return 'bg-teal-600 text-white'
  if (m < 2) return 'bg-emerald-500 text-ink-950'
  if (m < 3) return 'bg-cyan-600 text-white'
  if (m < 4) return 'bg-violet-600 text-white'
  if (m < 10) return 'bg-pink-600 text-white'
  return 'bg-orange-600 text-white'
}

const polar = (angleDeg: number, r: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
}

function arcPath(start: number, end: number, r0: number, r1: number) {
  const [x0, y0] = polar(start, r1)
  const [x1, y1] = polar(end, r1)
  const [x2, y2] = polar(end, r0)
  const [x3, y3] = polar(start, r0)
  const large = end - start > 180 ? 1 : 0
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`
}

const multLabel = (m: number) => `${formatDecimal(m, m % 1 ? 1 : 0)}×`

export default function WheelGame() {
  const balance = useCasino((s) => s.balance)
  const guard = useRoundGuard()
  const mounted = useMountedRef()
  const [banner, showBanner] = useResultBanner(2600)
  const jackpotId = useSvgId('jackpot')
  const [pointerScope, animatePointer] = useAnimate<HTMLDivElement>()

  const [bet, setBet] = useState(100)
  const [risk, setRisk] = useState<WheelRisk>('medium')
  const [spinning, setSpinning] = useState(false)
  const [landed, setLanded] = useState<number | null>(null)
  const [history, setHistory] = useState<{ id: number; multiplier: number; jackpot?: boolean }[]>([])

  const segments = useMemo(() => segmentsFor(risk), [risk])
  const angles = useMemo(() => segmentAngles(segments), [segments])
  const totalWeight = segments.reduce((s, x) => s + x.weight, 0)

  const rotation = useMotionValue(0)
  const lastSeg = useRef(-1)

  // Tick + pointer flick whenever a segment boundary passes the pointer.
  useMotionValueEvent(rotation, 'change', (v) => {
    const a = (((-v % 360) + 360) % 360)
    const idx = angles.findIndex((x) => a >= x.start && a < x.end)
    if (idx !== lastSeg.current) {
      lastSeg.current = idx
      if (spinning) {
        sfx.play('tick', { pitch: 0.9 + Math.random() * 0.3 })
        if (pointerScope.current) void animatePointer(pointerScope.current, { rotate: [0, -18, 0] }, { duration: 0.12 })
      }
    }
  })

  // Summary of odds per distinct multiplier.
  const legend = useMemo(() => {
    const map = new Map<string, { m: number; w: number; jackpot?: boolean }>()
    for (const s of segments) {
      const key = `${s.multiplier}-${!!s.jackpot}`
      const cur = map.get(key) ?? { m: s.multiplier, w: 0, jackpot: s.jackpot }
      cur.w += s.weight
      map.set(key, cur)
    }
    return [...map.values()].sort((a, b) => a.m - b.m)
  }, [segments])

  const spin = async () => {
    if (spinning) return
    if (bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостаточно фишек' })
      return
    }
    const idx = spinWheel(risk)
    const seg = segments[idx]
    const payout = Math.floor(bet * seg.multiplier)
    const roundId = useCasino.getState().startRound('wheel', bet, {
      payout,
      tags: seg.jackpot ? ['wheel-jackpot'] : undefined,
      detail: `${WHEEL_RISK_LABELS[risk]} риск · ${seg.jackpot ? 'джекпот ' : ''}${multLabel(seg.multiplier)}`,
    })
    if (!roundId) return
    guard.track(roundId)
    setSpinning(true)
    setLanded(null)
    sfx.play('whoosh')

    const { start, end } = angles[idx]
    const target = start + (end - start) * (0.2 + Math.random() * 0.6)
    const current = rotation.get()
    const base = (((-target - current) % 360) + 360) % 360
    const final = current + 360 * 6 + base
    await animate(rotation, final, { duration: 5.4, ease: [0.12, 0.75, 0.18, 1] })
    if (!mounted.current) return

    guard.finish(roundId)
    setSpinning(false)
    setLanded(idx)
    setHistory((h) => [{ id: Date.now(), multiplier: seg.multiplier, jackpot: seg.jackpot }, ...h].slice(0, 16))
    showBanner({
      kind: seg.jackpot ? 'bigwin' : payout > bet ? 'win' : payout === bet ? 'push' : 'lose',
      title: seg.jackpot ? 'Джекпот!' : seg.multiplier === 0 ? 'Мимо' : multLabel(seg.multiplier),
      amount: payout - bet,
      multiplier: seg.multiplier || undefined,
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-4">
        <Panel strong className="relative overflow-hidden p-4 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_45%,rgba(52,245,160,0.14),transparent)]" />
          <div className="relative mx-auto w-full max-w-[420px]">
            {/* Pointer */}
            <div ref={pointerScope} className="absolute top-[-6px] left-1/2 z-20 -ml-4 origin-top">
              <svg width="32" height="44" viewBox="0 0 32 44" className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
                <path d="M4 2h24L16 42Z" fill="#ff4d6d" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="16" cy="10" r="4" fill="#fff" />
              </svg>
            </div>
            <div className="absolute inset-[6%] rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
            <motion.svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]" style={{ rotate: rotation }} role="img" aria-label="Колесо фортуны">
              <defs>
                <linearGradient id={jackpotId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fff4d1" />
                  <stop offset="0.5" stopColor="#fcd96b" />
                  <stop offset="1" stopColor="#b98511" />
                </linearGradient>
                <linearGradient id="wheel-rim" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fff4d1" />
                  <stop offset="0.4" stopColor="#e2ab1c" />
                  <stop offset="0.7" stopColor="#6b4a0a" />
                  <stop offset="1" stopColor="#fcd96b" />
                </linearGradient>
              </defs>
              <circle cx={C} cy={C} r={C - 2} fill="url(#wheel-rim)" />
              <circle cx={C} cy={C} r={R + 4} fill="#070b18" />
              {segments.map((s, i) => {
                const { start, end } = angles[i]
                const mid = (start + end) / 2
                const [tx, ty] = polar(mid, R - 40)
                const isLanded = landed === i
                return (
                  <g key={i}>
                    <path
                      d={arcPath(start, end, 58, R)}
                      fill={s.jackpot ? `url(#${jackpotId})` : colorFor(s)}
                      stroke="#070b18"
                      strokeWidth="1.5"
                      opacity={landed !== null && !isLanded ? 0.55 : 1}
                    />
                    {s.multiplier > 0 && (
                      <text
                        x={tx}
                        y={ty}
                        transform={`rotate(${mid - 90} ${tx} ${ty})`}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={s.jackpot ? 12 : 13}
                        fontWeight={900}
                        fontFamily="Inter, system-ui, sans-serif"
                        fill={s.jackpot ? '#1a1206' : '#ffffff'}
                      >
                        {s.jackpot ? `★${multLabel(s.multiplier)}` : multLabel(s.multiplier)}
                      </text>
                    )}
                  </g>
                )
              })}
              {Array.from({ length: 24 }, (_, i) => {
                const [x, y] = polar(i * 15, C - 12)
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={4}
                    fill={i % 2 ? '#fff4d1' : '#34f5a0'}
                    style={{ animation: `pulse-glow ${spinning ? 0.3 : 1.6}s ease-in-out ${i * (spinning ? 0.02 : 0.07)}s infinite` }}
                  />
                )
              })}
              <circle cx={C} cy={C} r={58} fill="#0a1022" stroke="url(#wheel-rim)" strokeWidth="5" />
            </motion.svg>
            {/* Static hub label (does not rotate) */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                {landed !== null ? (
                  <motion.p key={landed} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn('font-display text-2xl font-black sm:text-3xl', segments[landed].jackpot ? 'text-gold-gradient' : segments[landed].multiplier > 0 ? 'text-emerald-300' : 'text-slate-400')}>
                    {multLabel(segments[landed].multiplier)}
                  </motion.p>
                ) : (
                  <Aperture className={cn('size-10 text-gold-300/70', spinning && 'animate-spin')} />
                )}
              </div>
            </div>
          </div>
          <ResultBanner result={banner} />
        </Panel>

        <Panel className="flex items-center gap-3 overflow-hidden p-3">
          <span className="shrink-0 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">История</span>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {history.length === 0 && <span className="text-xs text-slate-500">Пока пусто</span>}
            {history.map((h) => (
              <motion.span key={h.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className={cn('shrink-0 rounded-lg px-2 py-1 text-xs font-bold tabular-nums', chipColor(h.multiplier, h.jackpot))}>
                {multLabel(h.multiplier)}
              </motion.span>
            ))}
          </div>
        </Panel>
      </div>

      <Panel strong className="flex flex-col gap-4 p-4 lg:self-start">
        <BetInput value={bet} onChange={setBet} min={1} disabled={spinning} />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Риск</p>
          <SegmentedControl
            value={risk}
            onChange={(r) => {
              setRisk(r)
              setLanded(null)
            }}
            disabled={spinning}
            options={(['low', 'medium', 'high'] as const).map((r) => ({ value: r, label: WHEEL_RISK_LABELS[r] }))}
            label="Уровень риска"
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {legend.map((l) => (
            <div key={`${l.m}-${l.jackpot}`} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
              <span className={cn('rounded-md px-1.5 py-0.5 text-xs font-black tabular-nums', chipColor(l.m, l.jackpot))}>
                {l.jackpot ? `★ ${multLabel(l.m)}` : multLabel(l.m)}
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">{formatPercent(l.w / totalWeight, 1)}</span>
            </div>
          ))}
        </div>
        <Button variant="gold" size="xl" icon={Aperture} sound={false} disabled={spinning || bet > balance} onClick={() => void spin()}>
          {spinning ? 'Крутится…' : 'Крутить колесо'}
        </Button>
      </Panel>
    </div>
  )
}
