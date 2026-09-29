import { Eye, Ticket as TicketIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Panel } from '../../components/ui/Panel'
import { useElementSize } from '../../hooks/useElementSize'
import { useResultBanner, resultKind } from '../../hooks/useResultBanner'
import { useRoundGuard } from '../../hooks/useRoundGuard'
import { cn } from '../../lib/cn'
import { formatChips, formatPercent } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { toast } from '../../store/toasts'
import { buyTicket, PRIZE_BY_SYMBOL, SCRATCH_PRIZES, type Ticket } from './logic'

const REVEAL_AT = 0.55

/** Silver foil drawn on a canvas; pointer strokes erase it. */
function Foil({ onProgress, cleared, ticketId }: { onProgress: (p: number) => void; cleared: boolean; ticketId: number }) {
  const [wrapRef, { width, height }] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const strokes = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    const g = ctx.createLinearGradient(0, 0, width, height)
    g.addColorStop(0, '#d9dee7')
    g.addColorStop(0.35, '#9aa3b2')
    g.addColorStop(0.5, '#eef1f5')
    g.addColorStop(0.7, '#8d97a8')
    g.addColorStop(1, '#c9d0db')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
    // Glitter + repeating label
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.2, 1.2)
    }
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.rotate(-0.35)
    ctx.fillStyle = 'rgba(71, 85, 105, 0.35)'
    ctx.font = '900 18px Unbounded, Inter, sans-serif'
    ctx.textAlign = 'center'
    for (let y = -height; y < height; y += 46) {
      for (let x = -width; x < width; x += 150) ctx.fillText('СОТРИ', x + ((y / 46) % 2) * 75, y)
    }
    ctx.restore()
    strokes.current = 0
  }, [width, height, ticketId])

  const measure = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { width: w, height: h } = canvas
    const data = ctx.getImageData(0, 0, w, h).data
    let clear = 0
    let total = 0
    for (let i = 3; i < data.length; i += 4 * 64) {
      total++
      if (data[i] < 20) clear++
    }
    onProgress(clear / total)
  }, [onProgress])

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(26, width * 0.09)
    ctx.beginPath()
    const from = last.current ?? { x, y }
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    last.current = { x, y }
    if (++strokes.current % 8 === 0) {
      measure()
      sfx.play('tick', { pitch: 0.5 + Math.random() * 0.3 })
    }
  }

  const point = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <motion.canvas
        ref={canvasRef}
        className="size-full cursor-crosshair touch-none rounded-2xl"
        animate={{ opacity: cleared ? 0 : 1 }}
        transition={{ duration: 0.6 }}
        style={{ pointerEvents: cleared ? 'none' : 'auto' }}
        onPointerDown={(e) => {
          drawing.current = true
          last.current = null
          e.currentTarget.setPointerCapture(e.pointerId)
          const p = point(e)
          scratch(p.x, p.y)
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return
          const p = point(e)
          scratch(p.x, p.y)
        }}
        onPointerUp={() => {
          drawing.current = false
          last.current = null
          measure()
        }}
        aria-label="Защитный слой билета — сотрите его"
      />
    </div>
  )
}

export default function ScratchGame() {
  const balance = useCasino((s) => s.balance)
  const guard = useRoundGuard()
  const [banner, showBanner] = useResultBanner(2800)

  const [bet, setBet] = useState(100)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [ticketId, setTicketId] = useState(0)
  const [cleared, setCleared] = useState(false)
  const [progress, setProgress] = useState(0)
  const round = useRef<{ id: string; bet: number; ticket: Ticket } | null>(null)

  const settle = useCallback(() => {
    const r = round.current
    if (!r) return
    round.current = null
    const record = guard.finish(r.id)
    const payout = record?.payout ?? 0
    showBanner({
      kind: r.ticket.prize ? (r.ticket.prize.multiplier >= 10 ? 'bigwin' : resultKind(r.bet, payout)) : 'lose',
      title: r.ticket.prize ? `Три: ${r.ticket.prize.name.toLowerCase()}` : 'Без выигрыша',
      amount: payout - r.bet,
      multiplier: r.ticket.prize?.multiplier,
    })
  }, [guard, showBanner])

  const onProgress = useCallback(
    (p: number) => {
      setProgress(p)
      if (p >= REVEAL_AT && !cleared) {
        setCleared(true)
        settle()
      }
    },
    [cleared, settle],
  )

  const buy = () => {
    if (round.current) return
    if (bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостаточно фишек' })
      return
    }
    const t = buyTicket()
    const payout = t.prize ? Math.floor(bet * t.prize.multiplier) : 0
    const id = useCasino.getState().startRound('scratch', bet, {
      payout,
      tags: t.prize?.symbol === 'crown' ? ['scratch-top'] : undefined,
      detail: t.prize ? `${t.prize.name} ×${t.prize.multiplier}` : 'Без выигрыша',
    })
    if (!id) return
    guard.track(id)
    round.current = { id, bet, ticket: t }
    setTicket(t)
    setTicketId((n) => n + 1)
    setCleared(false)
    setProgress(0)
    sfx.play('deal')
  }

  const revealAll = () => {
    if (!round.current) return
    setCleared(true)
    sfx.play('whoosh')
    settle()
  }

  const active = !!ticket && !cleared
  const winning = cleared && ticket?.prize ? ticket.prize.symbol : null

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel strong className="relative overflow-hidden p-4 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(163,230,53,0.14),transparent)]" />
        <div className="relative mx-auto max-w-md">
          <div className="rounded-3xl bg-[linear-gradient(135deg,#bef264,#16a34a_45%,#14532d)] p-[3px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
            <div className="rounded-[22px] bg-[radial-gradient(120%_80%_at_50%_0%,#1a3a1f,#0a1a10)] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-lg font-black tracking-wide text-lime-200">Счастливый билет</p>
                <Icon name="four-leaf-clover" size={30} />
              </div>
              <div className="relative aspect-square">
                <div className="grid size-full grid-cols-3 gap-2">
                  {(ticket?.cells ?? Array.from({ length: 9 }, () => null)).map((s, i) => (
                    <motion.div
                      key={`${ticketId}-${i}`}
                      animate={winning && s === winning ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                      transition={winning && s === winning ? { duration: 0.8, repeat: Infinity } : undefined}
                      className={cn(
                        'grid place-items-center rounded-2xl bg-[radial-gradient(circle,#fefce8,#e7e5c8)] shadow-inner',
                        winning && s === winning && 'ring-4 ring-gold-300 shadow-glow-gold',
                        winning && s !== winning && 'opacity-50',
                      )}
                    >
                      {s && <Icon name={PRIZE_BY_SYMBOL[s].icon} size={52} className="drop-shadow-[0_3px_4px_rgba(0,0,0,0.3)]" />}
                    </motion.div>
                  ))}
                </div>
                {ticket && <Foil key={ticketId} ticketId={ticketId} cleared={cleared} onProgress={onProgress} />}
                {!ticket && (
                  <div className="absolute inset-0 grid place-items-center rounded-2xl bg-[linear-gradient(135deg,#d9dee7,#8d97a8)]">
                    <p className="font-display text-sm font-black tracking-widest text-slate-600 uppercase">Купите билет</p>
                  </div>
                )}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/40">
                <motion.div className="h-full bg-lime-300" animate={{ width: `${Math.min(1, cleared ? 1 : progress / REVEAL_AT) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="flex flex-col gap-4 p-4 lg:self-start">
        <BetInput value={bet} onChange={setBet} min={1} disabled={active} label="Цена билета" />
        {active ? (
          <Button variant="glass" size="lg" icon={Eye} onClick={revealAll}>
            Открыть всё
          </Button>
        ) : (
          <Button variant="gold" size="xl" icon={TicketIcon} sound={false} disabled={bet > balance} onClick={buy}>
            Купить билет · {formatChips(bet)}
          </Button>
        )}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">Три одинаковых символа</p>
          <ul className="space-y-1">
            {SCRATCH_PRIZES.map((p) => (
              <li key={p.symbol} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5', winning === p.symbol ? 'bg-gold-400/20 ring-1 ring-gold-300/50' : 'bg-white/[0.03]')}>
                <span className="flex">
                  {[0, 1, 2].map((i) => (
                    <Icon key={i} name={p.icon} size={18} className={cn(i > 0 && '-ml-1.5')} />
                  ))}
                </span>
                <span className="flex-1 text-xs text-slate-300">{p.name}</span>
                <span className="text-[10px] text-slate-500 tabular-nums">{formatPercent(p.chance, p.chance < 0.01 ? 1 : 0)}</span>
                <b className="w-12 text-right text-xs text-gold-200 tabular-nums">×{p.multiplier}</b>
              </li>
            ))}
          </ul>
        </div>
        <AnimatePresence>
          {active && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-[11px] text-slate-500">
              Сотрите слой пальцем или мышью
            </motion.p>
          )}
        </AnimatePresence>
      </Panel>
    </div>
  )
}
