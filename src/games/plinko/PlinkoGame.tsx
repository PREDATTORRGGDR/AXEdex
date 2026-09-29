import { CircleDot, Repeat } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { useElementSize } from '../../hooks/useElementSize'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { cn } from '../../lib/cn'
import { formatSigned } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { celebrate } from '../../store/fx'
import { toast } from '../../store/toasts'
import { dropPath, multipliers, RISK_LABELS, ROW_OPTIONS, slotOf, type Risk, type Rows } from './logic'

interface Ball {
  id: number
  roundId: string
  path: boolean[]
  slot: number
  start: number
  bet: number
  multiplier: number
  landed: boolean
  lastRow: number
}

interface Layout {
  sx: number
  sy: number
  top: number
  cx: number
  pegR: number
  ballR: number
  slotY: number
  slotH: number
}

const STEP_MS = 115

function layoutFor(width: number, height: number, rows: number): Layout {
  const sx = Math.min(width / (rows + 2.2), 46)
  const slotH = Math.max(22, Math.min(34, sx * 0.9))
  const sy = Math.min(sx * 0.95, (height - slotH - 40) / rows)
  return {
    sx,
    sy,
    top: 26,
    cx: width / 2,
    pegR: Math.max(2.2, sx * 0.1),
    ballR: Math.max(4.5, sx * 0.23),
    slotY: 26 + rows * sy + 6,
    slotH,
  }
}

/** Slot colour: gold in the middle, hot pink at the edges. */
function slotColor(k: number, slots: number): [string, string] {
  const d = Math.abs(k - (slots - 1) / 2) / ((slots - 1) / 2)
  const hue = 48 - d * 60
  return [`hsl(${hue} 95% 60%)`, `hsl(${hue} 90% 38%)`]
}

/** 0.35 -> "0,35", 2 -> "2", 1000 -> "1000" (fits a narrow slot). */
function formatMult(m: number) {
  return String(m).replace('.', ',')
}

export default function PlinkoGame() {
  const balance = useCasino((s) => s.balance)
  const guard = useRoundGuard()
  const [wrapRef, { width }] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [bet, setBet] = useState(50)
  const [risk, setRisk] = useState<Risk>('medium')
  const [rows, setRows] = useState<Rows>(12)
  const [inFlight, setInFlight] = useState(0)
  const [autoLeft, setAutoLeft] = useState(0)
  const [results, setResults] = useState<{ id: number; multiplier: number; net: number }[]>([])

  const balls = useRef<Ball[]>([])
  const pegHits = useRef(new Map<string, number>())
  const slotHits = useRef(new Map<number, number>())
  const seq = useRef(0)
  const table = multipliers(rows, risk)
  const tableRef = useRef(table)
  const height = Math.round(Math.min(560, Math.max(320, width * 0.85)))

  useEffect(() => {
    tableRef.current = table
  })

  const land = useCallback(
    (ball: Ball) => {
      guard.finish(ball.roundId)
      const payout = Math.floor(ball.bet * ball.multiplier)
      setResults((r) => [{ id: ball.id, multiplier: ball.multiplier, net: payout - ball.bet }, ...r].slice(0, 12))
      setInFlight((n) => n - 1)
      const pitch = Math.min(2, 0.7 + Math.log2(1 + ball.multiplier) * 0.25)
      sfx.play(ball.multiplier >= 1 ? 'coin' : 'peg', { pitch })
      if (ball.multiplier >= 10) {
        sfx.play('bigWin')
        celebrate('coins', Math.min(3, ball.multiplier / 20 + 1))
      }
    },
    [guard],
  )

  // Draw + simulate.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')!
    const L = layoutFor(width, height, rows)
    let raf = 0

    const pegX = (r: number, i: number) => L.cx + (i - (r + 2) / 2) * L.sx
    const pegY = (r: number) => L.top + r * L.sy

    const frame = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const tbl = tableRef.current
      const slots = rows + 1

      // Pegs
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < r + 3; i++) {
          const hit = pegHits.current.get(`${r}:${i}`) ?? 0
          const glow = Math.max(0, 1 - (now - hit) / 350)
          ctx.beginPath()
          ctx.arc(pegX(r, i), pegY(r), L.pegR * (1 + glow * 0.6), 0, Math.PI * 2)
          ctx.fillStyle = glow > 0 ? `rgba(252, 217, 107, ${0.6 + glow * 0.4})` : 'rgba(226, 232, 240, 0.85)'
          if (glow > 0) {
            ctx.shadowColor = '#fcd96b'
            ctx.shadowBlur = 14 * glow
          }
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      // Slots
      const slotW = L.sx - 3
      const baseFont = Math.max(6, Math.min(12, L.sx * 0.34))
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let k = 0; k < slots; k++) {
        const x = L.cx + (k - rows / 2) * L.sx
        const hit = slotHits.current.get(k) ?? 0
        const bump = Math.max(0, 1 - (now - hit) / 300)
        const y = L.slotY + Math.sin(bump * Math.PI) * 6
        const [c1, c2] = slotColor(k, slots)
        const g = ctx.createLinearGradient(0, y, 0, y + L.slotH)
        g.addColorStop(0, c1)
        g.addColorStop(1, c2)
        ctx.fillStyle = g
        if (bump > 0) {
          ctx.shadowColor = c1
          ctx.shadowBlur = 18 * bump
        }
        ctx.beginPath()
        ctx.roundRect(x - slotW / 2, y, slotW, L.slotH, 5)
        ctx.fill()
        ctx.shadowBlur = 0
        const label = formatMult(tbl[k])
        ctx.font = `800 ${label.length >= 3 ? baseFont * 0.85 : baseFont}px Inter, system-ui, sans-serif`
        ctx.fillStyle = '#1a1206'
        ctx.fillText(label, x, y + L.slotH / 2 + 0.5, slotW - 2)
      }

      // Balls
      for (const b of balls.current) {
        if (b.landed) continue
        const elapsed = now - b.start
        const seg = Math.floor(elapsed / STEP_MS)
        const t = (elapsed % STEP_MS) / STEP_MS
        let rights = 0
        for (let i = 0; i < Math.min(seg, rows); i++) if (b.path[i]) rights++
        let x: number
        let y: number
        if (seg < 0) continue
        if (seg >= rows) {
          // Final drop into the slot.
          x = L.cx + (b.slot - rows / 2) * L.sx
          y = L.slotY - L.ballR + Math.min(1, (elapsed - rows * STEP_MS) / 120) * (L.slotH * 0.4)
          if (elapsed >= rows * STEP_MS + 120) {
            b.landed = true
            slotHits.current.set(b.slot, now)
            land(b)
            continue
          }
        } else {
          // Hop from the peg in row `seg` to the next contact point.
          const x0 = L.cx + (rights - seg / 2) * L.sx
          const y0 = pegY(seg) - L.pegR - L.ballR
          const nextRights = rights + (b.path[seg] ? 1 : 0)
          const x1 = L.cx + (nextRights - (seg + 1) / 2) * L.sx
          const y1 = seg + 1 < rows ? pegY(seg + 1) - L.pegR - L.ballR : L.slotY - L.ballR
          x = x0 + (x1 - x0) * t
          y = y0 + (y1 - y0) * t * t - L.sy * 0.45 * 4 * t * (1 - t)
          if (seg !== b.lastRow) {
            b.lastRow = seg
            const pegIndex = rights + 1
            pegHits.current.set(`${seg}:${pegIndex}`, now)
            sfx.play('peg', { pitch: 0.8 + Math.random() * 0.5 })
          }
        }
        const g = ctx.createRadialGradient(x - L.ballR * 0.35, y - L.ballR * 0.35, 1, x, y, L.ballR)
        g.addColorStop(0, '#ffffff')
        g.addColorStop(0.5, '#f9a8d4')
        g.addColorStop(1, '#db2777')
        ctx.beginPath()
        ctx.arc(x, y, L.ballR, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.shadowColor = '#f472d0'
        ctx.shadowBlur = 12
        ctx.fill()
        ctx.shadowBlur = 0
      }
      balls.current = balls.current.filter((b) => !b.landed)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [width, height, rows, land])

  const drop = useCallback(() => {
    const state = useCasino.getState()
    if (bet > state.balance) {
      sfx.play('error')
      setAutoLeft(0)
      toast({ kind: 'warning', title: 'Недостаточно фишек' })
      return
    }
    const path = dropPath(rows)
    const slot = slotOf(path)
    const multiplier = tableRef.current[slot]
    const edge = slot === 0 || slot === rows
    const roundId = state.startRound('plinko', bet, {
      payout: Math.floor(bet * multiplier),
      tags: edge ? ['plinko-edge'] : undefined,
      detail: `${rows} рядов · ×${formatMult(multiplier)}`,
    })
    if (!roundId) return
    guard.track(roundId)
    balls.current.push({ id: ++seq.current, roundId, path, slot, start: performance.now(), bet, multiplier, landed: false, lastRow: -1 })
    setInFlight((n) => n + 1)
    sfx.play('click', { pitch: 1.4 })
  }, [bet, rows, guard])

  useEffect(() => {
    if (autoLeft <= 0) return
    const t = window.setTimeout(() => {
      setAutoLeft((n) => n - 1)
      drop()
    }, 260)
    return () => window.clearTimeout(t)
  }, [autoLeft, drop])

  const locked = inFlight > 0

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel strong className="relative overflow-hidden p-3 sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(167,139,250,0.2),transparent)]" />
        <div ref={wrapRef} className="relative w-full" style={{ height }}>
          <canvas ref={canvasRef} className="absolute inset-0" role="img" aria-label="Доска Плинко" />
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel strong className="flex flex-col gap-4 p-4">
          <BetInput value={bet} onChange={setBet} min={1} />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400">Риск</p>
            <SegmentedControl
              value={risk}
              onChange={setRisk}
              disabled={locked}
              options={(['low', 'medium', 'high'] as const).map((r) => ({ value: r, label: RISK_LABELS[r] }))}
              label="Уровень риска"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400">Ряды</p>
            <SegmentedControl value={rows} onChange={setRows} disabled={locked} options={ROW_OPTIONS.map((r) => ({ value: r, label: String(r) }))} label="Количество рядов" />
          </div>
          <Button variant="gold" size="xl" icon={CircleDot} sound={false} disabled={bet > balance} onClick={drop}>
            Бросить шарик
          </Button>
          <Button variant={autoLeft > 0 ? 'violet' : 'glass'} icon={Repeat} onClick={() => setAutoLeft((n) => (n > 0 ? 0 : 10))} aria-pressed={autoLeft > 0}>
            {autoLeft > 0 ? `Остановить (${autoLeft})` : 'Авто: 10 шариков'}
          </Button>
          {locked && <p className="text-center text-[11px] text-slate-500">Риск и ряды можно менять, когда все шарики упадут.</p>}
        </Panel>

        <Panel className="p-4">
          <p className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Последние шарики</p>
          {results.length === 0 ? (
            <p className="text-sm text-slate-500">Бросьте первый шарик!</p>
          ) : (
            <ul className="grid grid-cols-3 gap-1.5">
              <AnimatePresence initial={false}>
                {results.map((r) => (
                  <motion.li
                    key={r.id}
                    layout
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-center ring-1',
                      r.multiplier >= 2 ? 'bg-gold-400/15 ring-gold-300/30' : r.multiplier >= 1 ? 'bg-emerald-400/10 ring-emerald-300/20' : 'bg-white/[0.03] ring-white/10',
                    )}
                  >
                    <p className="text-sm font-black text-white tabular-nums">×{formatMult(r.multiplier)}</p>
                    <p className={cn('text-[10px] tabular-nums', r.net > 0 ? 'text-emerald-300' : r.net < 0 ? 'text-rose-300' : 'text-slate-400')}>{formatSigned(r.net)}</p>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
