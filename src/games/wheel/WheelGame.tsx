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
  if (s.multiplier === 0) return '#171c27'
  if (s.multiplier < 1.5) return '#0d9488'
  if (s.multiplier < 2) return '#10b981'
  if (s.multiplier < 3) return '#0891b2'
  if (s.multiplier < 4) return '#7c3aed'
  if (s.multiplier < 10) return '#db2777'
  return '#ea580c'
}

function chipColor(m: number, jackpot?: boolean) {
  if (jackpot) return 'bg-gold-300 text-ink-950'
  if (m === 0) return 'bg-ink-600 text-slate-300'
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

  const [bet, setBet] = useState(10)
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
      toast({ kind: 'warning', title: 'Недостатньо фішок' })
      return
    }
    const idx = spinWheel(risk)
    const seg = segments[idx]
    const payout = Math.floor(bet * seg.multiplier)
    const roundId = useCasino.getState().startRound('wheel', bet, {
      payout,
      tags: seg.jackpot ? ['wheel-jackpot'] : undefined,
      detail: `${WHEEL_RISK_LABELS[risk]} ризик · ${seg.jackpot ? 'джекпот ' : ''}${multLabel(seg.multiplier)}`,
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
      title: seg.jackpot ? 'Джекпот!' : seg.multiplier === 0 ? 'Повз' : multLabel(seg.multiplier),
      amount: payout - bet,
      multiplier: seg.multiplier || undefined,
    })
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0 space-y-3 sm:space-y-4 lg:col-start-2 lg:row-start-1">
        <Panel strong className="relative overflow-hidden bg-[linear-gradient(180deg,#0b0f16,#07090d)] p-4 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_45%,rgba(25,245,163,0.12),transparent)]" />
          <div className="relative mx-auto w-full max-w-[420px]">
            {/* Pointer */}
            <div ref={pointerScope} className="absolute top-[-6px] left-1/2 z-20 -ml-4 origin-top">
              <svg width="32" height="44" viewBox="0 0 32 44" className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
                <path d="M4 2h24L16 42Z" fill="#ff4d6d" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="16" cy="10" r="4" fill="#fff" />
              </svg>
            </div>
            <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(closest-side,rgba(25,245,163,0.14),transparent)]" aria-hidden />
            <motion.svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]" style={{ rotate: rotation }} role="img" aria-label="Колесо фортуни">
              <defs>
                <linearGradient id={jackpotId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fbf0cf" />
                  <stop offset="0.5" stopColor="#f3cf6e" />
                  <stop offset="1" stopColor="#a8761d" />
                </linearGradient>
                <linearGradient id="wheel-rim" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fbf0cf" />
                  <stop offset="0.4" stopColor="#d4a543" />
                  <stop offset="0.7" stopColor="#664710" />
                  <stop offset="1" stopColor="#f3cf6e" />
                </linearGradient>
              </defs>
              <circle cx={C} cy={C} r={C - 2} fill="url(#wheel-rim)" />
              <circle cx={C} cy={C} r={R + 4} fill="#07090d" />
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
                      stroke="#07090d"
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
                        fontFamily="'JetBrains Mono Variable', ui-monospace, monospace"
                        fill={s.jackpot ? '#1a1206' : '#ffffff'}
                      >
                        {s.jackpot ? `★${multLabel(s.multiplier)}` : multLabel(s.multiplier)}
                      </text>
                    )}
                  </g>
                )
              })}
              <circle cx={C} cy={C} r={58} fill="#0b0e14" stroke="url(#wheel-rim)" strokeWidth="5" />
            </motion.svg>
            {/* Bulbs sit on a static ring so their blinking never repaints the spinning wheel. */}
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0 w-full" aria-hidden>
                {Array.from({ length: 24 }, (_, i) => {
                  const [x, y] = polar(i * 15, C - 12)
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={4}
                      fill={i % 2 ? '#fbf0cf' : '#19f5a3'}
                      style={{ animation: `pulse-glow ${spinning ? 0.3 : 1.6}s ease-in-out ${i * (spinning ? 0.02 : 0.07)}s infinite` }}
                    />
                  )
                })}
            </svg>
            {/* Static hub label (does not rotate) */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                {landed !== null ? (
                  <motion.p key={landed} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn('num text-2xl font-bold sm:text-3xl', segments[landed].jackpot ? 'text-gold-gradient' : segments[landed].multiplier > 0 ? 'text-neon-emerald' : 'text-slate-400')}>
                    {multLabel(segments[landed].multiplier)}
                  </motion.p>
                ) : (
                  <Aperture className={cn('size-10 text-neon-emerald/70', spinning && 'animate-spin')} />
                )}
              </div>
            </div>
          </div>
          <ResultBanner result={banner} />
        </Panel>

        <Panel className="flex items-center gap-3 overflow-hidden p-3">
          <span className="eyebrow shrink-0">Історія</span>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {history.length === 0 && <span className="text-xs text-slate-500">Поки порожньо</span>}
            {history.map((h) => (
              <motion.span key={h.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className={cn('num shrink-0 rounded-md px-2 py-1 text-xs font-bold', chipColor(h.multiplier, h.jackpot))}>
                {multLabel(h.multiplier)}
              </motion.span>
            ))}
          </div>
        </Panel>
      </div>

      <Panel strong className="flex flex-col gap-4 p-4 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
        <BetInput value={bet} onChange={setBet} min={1} disabled={spinning} />
        <div className="space-y-1.5">
          <p className="eyebrow">Ризик</p>
          <SegmentedControl
            value={risk}
            onChange={(r) => {
              setRisk(r)
              setLanded(null)
            }}
            disabled={spinning}
            options={(['low', 'medium', 'high'] as const).map((r) => ({ value: r, label: WHEEL_RISK_LABELS[r] }))}
            label="Рівень ризику"
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {legend.map((l) => (
            <div key={`${l.m}-${l.jackpot}`} className="well flex min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5">
              <span className={cn('num rounded-md px-1.5 py-0.5 text-xs font-bold', chipColor(l.m, l.jackpot))}>
                {l.jackpot ? `★ ${multLabel(l.m)}` : multLabel(l.m)}
              </span>
              <span className="num text-[11px] text-slate-500">{formatPercent(l.w / totalWeight, 1)}</span>
            </div>
          ))}
        </div>
        <Button variant="emerald" size="xl" icon={Aperture} sound={false} disabled={spinning || bet > balance} onClick={() => void spin()}>
          {spinning ? 'Крутиться…' : 'Крутити колесо'}
        </Button>
      </Panel>
    </div>
  )
}
