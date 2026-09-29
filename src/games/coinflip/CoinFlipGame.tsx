import { HandCoins, Play } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { ResultBanner } from '../../components/game/ResultBanner'
import { CROSSED_AXES_PATH } from '../../components/layout/logoPaths'
import { BetInput } from '../../components/ui/BetInput'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Panel } from '../../components/ui/Panel'
import { useMountedRef } from '../../hooks/useMounted'
import { useResultBanner } from '../../hooks/useResultBanner'
import { wait } from '../../lib/async'
import { cn } from '../../lib/cn'
import { formatChips, formatMultiplier } from '../../lib/format'
import { useCasino, type Settlement } from '../../store/casino'
import { toast } from '../../store/toasts'
import { COIN_LABELS, COIN_STEP, coinMultiplier, flipCoin, type CoinSide } from './logic'

type Phase = 'idle' | 'playing' | 'busted' | 'cashed'

function cashSettlement(bet: number, wins: number): Settlement {
  const m = coinMultiplier(wins)
  return { payout: Math.floor(bet * m), tags: wins >= 5 ? ['coin-5'] : undefined, detail: `Серия ${wins} · ${formatMultiplier(m)}` }
}

function CoinFace({ side }: { side: CoinSide }) {
  const heads = side === 'heads'
  return (
    <div
      className={cn(
        'absolute inset-0 grid place-items-center rounded-full [backface-visibility:hidden]',
        heads
          ? 'bg-[radial-gradient(circle_at_35%_30%,#fff4d1,#fcd96b_40%,#b98511_80%)] shadow-[inset_0_0_0_6px_rgba(138,98,13,0.6),inset_0_0_0_10px_rgba(255,244,209,0.5)]'
          : 'bg-[radial-gradient(circle_at_35%_30%,#ffffff,#cbd5e1_40%,#64748b_85%)] shadow-[inset_0_0_0_6px_rgba(71,85,105,0.6),inset_0_0_0_10px_rgba(255,255,255,0.5)] [transform:rotateY(180deg)]',
      )}
    >
      {heads ? (
        <Icon name="eagle" size={88} className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]" />
      ) : (
        <svg viewBox="0 0 512 512" className="size-24 drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]" aria-hidden>
          <path d={CROSSED_AXES_PATH} fill="#334155" />
        </svg>
      )}
    </div>
  )
}

export default function CoinFlipGame() {
  const balance = useCasino((s) => s.balance)
  const mounted = useMountedRef()
  const [banner, showBanner] = useResultBanner(2400)

  const [bet, setBet] = useState(10)
  const [phase, setPhase] = useState<Phase>('idle')
  const [wins, setWins] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [trail, setTrail] = useState<{ id: number; side: CoinSide; ok: boolean }[]>([])
  const [activeBet, setActiveBet] = useState(0)
  const round = useRef<{ id: string; bet: number } | null>(null)

  useEffect(
    () => () => {
      const r = round.current
      if (r) useCasino.getState().finishRound(r.id)
    },
    [],
  )

  const call = async (side: CoinSide) => {
    if (flipping) return
    let r = round.current
    if (!r) {
      if (bet > balance) {
        sfx.play('error')
        toast({ kind: 'warning', title: 'Недостаточно фишек' })
        return
      }
      const id = useCasino.getState().startRound('coinflip', bet, { payout: bet, detail: 'Возврат ставки' })
      if (!id) return
      r = { id, bet }
      round.current = r
      setActiveBet(bet)
      setWins(0)
      setTrail([])
      setPhase('playing')
    }
    const result = flipCoin()
    const ok = result === side
    // Land on the result face after several full spins.
    const base = Math.ceil(rotation / 360) * 360 + 360 * 5
    setRotation(base + (result === 'tails' ? 180 : 0))
    setFlipping(true)
    sfx.play('whoosh')
    await wait(1250)
    if (!mounted.current) return
    setFlipping(false)
    sfx.play('coin', { pitch: result === 'heads' ? 1 : 0.85 })
    setTrail((t) => [...t, { id: Date.now(), side: result, ok }].slice(-16))
    if (ok) {
      const w = wins + 1
      setWins(w)
      useCasino.getState().setRoundFallback(r.id, cashSettlement(r.bet, w))
      haptic(15)
      sfx.play('gem', { pitch: 0.9 + w * 0.08 })
    } else {
      round.current = null
      useCasino.getState().finishRound(r.id, { payout: 0, detail: `Серия ${wins} · ошибка` })
      setPhase('busted')
      showBanner({ kind: 'lose', title: `Выпала ${COIN_LABELS[result].toLowerCase()}`, amount: -r.bet })
    }
  }

  const cashOut = () => {
    const r = round.current
    if (!r || wins === 0 || flipping) return
    round.current = null
    const s = cashSettlement(r.bet, wins)
    useCasino.getState().finishRound(r.id, s)
    setPhase('cashed')
    const m = coinMultiplier(wins)
    sfx.play('cashout')
    showBanner({ kind: m >= 10 ? 'bigwin' : 'win', title: `Серия из ${wins}`, amount: s.payout - r.bet, multiplier: m }, { silent: m < 10 })
  }

  const playing = phase === 'playing'
  const current = coinMultiplier(wins)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel strong className="relative overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(253,224,71,0.16),transparent)]" />
        <div className="relative flex min-h-[340px] flex-col items-center justify-end gap-5 pt-24">
          <div className="relative [perspective:900px]">
            <motion.div className="absolute -bottom-6 left-1/2 h-4 w-32 -translate-x-1/2 rounded-full bg-black/50 blur-md" animate={{ scaleX: flipping ? [1, 0.5, 1] : 1, opacity: flipping ? [0.6, 0.25, 0.6] : 0.6 }} transition={{ duration: 1.2 }} />
            <motion.div
              className="relative size-40 [transform-style:preserve-3d] sm:size-44"
              animate={{ rotateY: rotation, y: flipping ? [0, -90, 0] : 0 }}
              transition={{ rotateY: { duration: 1.2, ease: [0.25, 0.8, 0.3, 1] }, y: { duration: 1.2, times: [0, 0.45, 1], ease: 'easeOut' } }}
            >
              <CoinFace side="heads" />
              <CoinFace side="tails" />
            </motion.div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/10">
              <p className="text-[10px] text-slate-400">Серия</p>
              <p className="font-display text-lg font-black text-white tabular-nums">{wins}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/10">
              <p className="text-[10px] text-slate-400">Множитель</p>
              <p className="font-display text-lg font-black text-gold-200 tabular-nums">{formatMultiplier(current)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2 ring-1 ring-white/10">
              <p className="text-[10px] text-slate-400">Следующий</p>
              <p className="font-display text-lg font-black text-emerald-300 tabular-nums">{formatMultiplier(coinMultiplier(wins + 1))}</p>
            </div>
          </div>
          <div className="flex min-h-7 flex-wrap justify-center gap-1">
            {trail.map((t) => (
              <span key={t.id} className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', t.ok ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300')}>
                {COIN_LABELS[t.side]}
              </span>
            ))}
          </div>
        </div>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="flex flex-col gap-3 p-4 lg:self-start">
        <BetInput value={bet} onChange={setBet} min={1} disabled={playing || flipping} />
        <p className="text-xs text-slate-400">Каждый верный бросок умножает выигрыш на {formatMultiplier(COIN_STEP)}.</p>
        <div className="grid grid-cols-2 gap-2">
          {(['heads', 'tails'] as const).map((side) => (
            <Button key={side} variant={side === 'heads' ? 'gold' : 'glass'} size="lg" sound={false} disabled={flipping || (!playing && bet > balance)} onClick={() => void call(side)} className="h-14">
              <Icon name={side === 'heads' ? 'eagle' : 'coin'} size={24} />
              {COIN_LABELS[side]}
            </Button>
          ))}
        </div>
        {playing ? (
          <Button variant="emerald" size="lg" icon={HandCoins} sound={false} disabled={flipping || wins === 0} onClick={cashOut}>
            {wins === 0 ? 'Сначала угадайте бросок' : `Забрать ${formatChips(Math.floor(activeBet * current))}`}
          </Button>
        ) : (
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
            <Play className="size-3" /> Выберите сторону — первый бросок начнёт серию
          </p>
        )}
      </Panel>
    </div>
  )
}
