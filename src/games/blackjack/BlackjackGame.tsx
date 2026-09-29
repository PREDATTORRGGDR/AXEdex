import { Hand, Layers2, Plus, RotateCcw, Shield, Split, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { sfx } from '../../audio/sfx'
import { PlayingCard, CardBack } from '../../components/game/PlayingCard'
import { ResultBanner } from '../../components/game/ResultBanner'
import { Button } from '../../components/ui/Button'
import { CasinoChip, ChipSelector } from '../../components/ui/CasinoChip'
import { Panel } from '../../components/ui/Panel'
import { useResultBanner } from '../../hooks/useResultBanner'
import { chipLabel } from '../../lib/chips'
import { cn } from '../../lib/cn'
import { formatChips } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { toast } from '../../store/toasts'
import { handTotal, OUTCOME_LABEL, SHOE_SIZE, type HandResult, type PlayerHand } from './logic'
import { selectActions, useBlackjack } from './store'

const SHOE_ORIGIN = { x: 220, y: -180 }

function TotalBadge({ cards, hidden, tone = 'default' }: { cards: PlayerHand['cards']; hidden?: boolean; tone?: 'default' | 'active' }) {
  if (cards.length === 0) return null
  const { total, soft } = handTotal(hidden ? cards.slice(0, 1) : cards)
  const bust = total > 21
  return (
    <motion.span
      key={`${total}-${hidden}`}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'rounded-full px-2.5 py-0.5 text-sm font-black tabular-nums shadow-lg',
        bust ? 'bg-rose-500 text-white' : total === 21 ? 'bg-gold-300 text-ink-950' : tone === 'active' ? 'bg-emerald-400 text-ink-950' : 'bg-ink-950/80 text-white ring-1 ring-white/20',
      )}
    >
      {hidden ? `${total} + ?` : soft && total < 21 ? `${total - 10}/${total}` : total}
    </motion.span>
  )
}

const OUTCOME_STYLE: Record<HandResult['outcome'], string> = {
  blackjack: 'bg-gold-300 text-ink-950',
  win: 'bg-emerald-400 text-ink-950',
  push: 'bg-sky-300 text-ink-950',
  lose: 'bg-rose-500 text-white',
  bust: 'bg-rose-500 text-white',
}

function HandView({ hand, index, active, result, many }: { hand: PlayerHand; index: number; active: boolean; result?: HandResult; many: boolean }) {
  return (
    <motion.div
      layout
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl px-2 pt-2 pb-3 transition-colors sm:px-3',
        active && many && 'bg-emerald-400/[0.07] ring-1 ring-emerald-300/50',
      )}
    >
      <div className="flex items-center gap-2">
        <TotalBadge cards={hand.cards} tone={active ? 'active' : 'default'} />
        {hand.doubled && <span className="rounded-full bg-violet-500/80 px-2 py-0.5 text-[10px] font-bold text-white">×2</span>}
      </div>
      <div className="flex min-h-[92px] justify-center sm:min-h-[130px]">
        {hand.cards.map((card, i) => (
          <div key={card.id} className={cn(i > 0 && '-ml-9 sm:-ml-12')} style={{ zIndex: i }}>
            <PlayingCard
              card={card}
              size="lg"
              from={SHOE_ORIGIN}
              highlight={result?.outcome === 'blackjack' ? 'gold' : result?.outcome === 'win' ? 'green' : null}
              dimmed={result?.outcome === 'lose' || result?.outcome === 'bust'}
              className={cn(hand.doubled && i === 2 && 'rotate-90')}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <CasinoChip value={hand.bet} size={26} label={chipLabel(hand.bet)} />
        <span className="text-xs font-bold text-gold-100 tabular-nums">{formatChips(hand.bet)}</span>
        {many && <span className="text-[10px] text-slate-400">· рука {index + 1}</span>}
      </div>
      <AnimatePresence>
        {result && (
          <motion.span
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className={cn('absolute -top-3 rounded-full px-3 py-1 text-xs font-black uppercase shadow-xl', OUTCOME_STYLE[result.outcome])}
          >
            {OUTCOME_LABEL[result.outcome]}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ShuffleOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 grid place-items-center rounded-3xl bg-ink-950/60 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-28 w-40">
          {Array.from({ length: 10 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute top-2 left-1/2 h-24 w-16 -ml-8"
              animate={{ x: [i % 2 ? -46 : 46, 0, i % 2 ? -46 : 46], rotate: [i % 2 ? -12 : 12, 0, i % 2 ? -12 : 12], y: [0, -i * 1.5, 0] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.04, ease: 'easeInOut' }}
              style={{ zIndex: i }}
            >
              <div className="size-full rounded-lg">
                <CardBack />
              </div>
            </motion.div>
          ))}
        </div>
        <p className="font-display text-sm font-bold tracking-widest text-gold-200 uppercase">Тасуем шуз…</p>
      </div>
    </motion.div>
  )
}

export default function BlackjackGame() {
  const bj = useBlackjack(
    useShallow((s) => ({
      phase: s.phase,
      dealer: s.dealer,
      holeRevealed: s.holeRevealed,
      hands: s.hands,
      active: s.active,
      bet: s.bet,
      insurance: s.insurance,
      results: s.results,
      insuranceWon: s.insuranceWon,
      totalPayout: s.totalPayout,
      totalWager: s.totalWager,
      busy: s.busy,
      shuffling: s.shuffling,
      shoeLeft: s.shoe.length,
    })),
  )
  const actions = useBlackjack(useShallow(selectActions))
  const { setBet, deal, resolveInsurance, hit, stand, double, split, newRound, reconcile } = useBlackjack.getState()
  const balance = useCasino((s) => s.balance)
  const [chip, setChip] = useState(100)
  const [banner, showBanner] = useResultBanner(2600)
  const shownFor = useRef<HandResult[] | null>(null)

  useEffect(() => {
    reconcile()
  }, [reconcile])

  // Round outcome banner.
  useEffect(() => {
    if (bj.phase !== 'settled' || !bj.results || shownFor.current === bj.results) return
    shownFor.current = bj.results
    const net = bj.totalPayout - bj.totalWager
    const natural = bj.results.some((r) => r.outcome === 'blackjack')
    const title =
      bj.results.length === 1
        ? OUTCOME_LABEL[bj.results[0].outcome]
        : net > 0
          ? 'Победа'
          : net < 0
            ? 'Проигрыш'
            : 'Ничья'
    showBanner({
      kind: natural && net > 0 ? 'bigwin' : net > 0 ? 'win' : net < 0 ? 'lose' : 'push',
      title,
      amount: net,
      subtitle: bj.insuranceWon ? 'Страховка сыграла: выплата 2 к 1' : `Дилер: ${handTotal(bj.dealer).total}`,
    })
  }, [bj.phase, bj.results, bj.totalPayout, bj.totalWager, bj.insuranceWon, bj.dealer, showBanner])

  const betting = bj.phase === 'betting' || bj.phase === 'settled'
  const many = bj.hands.length > 1

  const addChip = (v: number) => {
    setChip(v)
    if (!betting || bj.busy) return
    const base = bj.phase === 'settled' ? 0 : bj.bet
    if (bj.phase === 'settled') newRound()
    if (base + v > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостаточно фишек' })
      return
    }
    sfx.play('chip')
    setBet(base + v)
  }

  const onDeal = () => {
    if (bj.bet > balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостаточно фишек', message: 'Уменьшите ставку или заберите бесплатные фишки.' })
      return
    }
    void deal()
  }

  return (
    <div className="space-y-4">
      <Panel strong className="felt relative overflow-hidden rounded-3xl border-2 border-gold-400/25 p-3 sm:p-6">
        {/* Table print */}
        <div className="pointer-events-none absolute inset-x-0 top-[44%] flex flex-col items-center gap-1 text-center opacity-80">
          <p className="font-display text-[11px] font-bold tracking-[0.3em] text-gold-200/70 uppercase sm:text-sm">Блэкджек платит 3 к 2</p>
          <p className="text-[9px] font-semibold tracking-[0.2em] text-emerald-100/40 uppercase sm:text-[11px]">
            Дилер стоит на мягких 17 · Страховка 2 к 1
          </p>
        </div>

        {/* Shoe */}
        <div className="absolute top-3 right-3 flex flex-col items-center gap-1 sm:top-5 sm:right-6" aria-label={`В шузе ${bj.shoeLeft} карт`}>
          <div className="relative h-16 w-12 sm:h-20 sm:w-14">
            {[0, 1, 2].map((i) => (
              <div key={i} className="absolute inset-0 rounded-md" style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }}>
                <CardBack />
              </div>
            ))}
          </div>
          <div className="h-1 w-12 overflow-hidden rounded-full bg-black/40 sm:w-14">
            <div className="h-full bg-gold-300" style={{ width: `${(bj.shoeLeft / SHOE_SIZE) * 100}%` }} />
          </div>
          <span className="text-[9px] font-semibold text-emerald-100/60">{bj.shoeLeft || SHOE_SIZE} карт</span>
        </div>

        {/* Dealer */}
        <div className="relative flex min-h-[150px] flex-col items-center gap-2 sm:min-h-[190px]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-[0.2em] text-emerald-100/70 uppercase">Дилер</span>
            <TotalBadge cards={bj.dealer} hidden={!bj.holeRevealed && bj.dealer.length > 1} />
          </div>
          <div className="flex min-h-[92px] justify-center sm:min-h-[130px]">
            {bj.dealer.map((card, i) => (
              <div key={card.id} className={cn(i > 0 && '-ml-9 sm:-ml-12')} style={{ zIndex: i }}>
                <PlayingCard card={card} size="lg" from={SHOE_ORIGIN} faceDown={i === 1 && !bj.holeRevealed} />
              </div>
            ))}
            {bj.dealer.length === 0 && <div className="h-[92px] w-[64px] rounded-xl border-2 border-dashed border-emerald-100/15 sm:h-[130px] sm:w-[92px]" />}
          </div>
        </div>

        {/* Player */}
        <div className="relative mt-10 flex min-h-[190px] flex-wrap items-end justify-center gap-2 sm:mt-14 sm:min-h-[230px] sm:gap-4">
          {bj.hands.length === 0 ? (
            <div className="flex flex-col items-center gap-3">
              <div className="grid size-24 place-items-center rounded-full border-2 border-dashed border-gold-300/30">
                <AnimatePresence mode="popLayout">
                  {bj.bet > 0 ? (
                    <motion.div key={bj.bet} initial={{ y: -30, scale: 0.6, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                      <CasinoChip value={bj.bet} size={64} label={chipLabel(bj.bet)} />
                    </motion.div>
                  ) : (
                    <span className="text-xs text-emerald-100/50">Ставка</span>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-sm font-semibold text-gold-100">Ставка: {formatChips(bj.bet)}</p>
            </div>
          ) : (
            bj.hands.map((hand, i) => (
              <HandView key={i} hand={hand} index={i} many={many} active={bj.phase === 'player' && i === bj.active} result={bj.results?.[i]} />
            ))
          )}
        </div>

        {bj.insurance > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-ink-950/70 px-3 py-1 text-xs text-sky-200 ring-1 ring-sky-300/30">
            <Shield className="size-3.5" /> Страховка {formatChips(bj.insurance)}
          </div>
        )}

        <AnimatePresence>{bj.shuffling && <ShuffleOverlay />}</AnimatePresence>
        <ResultBanner result={banner} />
      </Panel>

      <Panel strong className="sticky bottom-[76px] z-20 p-3 sm:p-4 lg:bottom-4">
        <AnimatePresence mode="wait" initial={false}>
          {betting && (
            <motion.div key="bet" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-3 md:flex-row md:items-center">
              <ChipSelector value={chip} onChange={addChip} balance={balance} />
              <p className="text-xs text-slate-400 md:ml-2 md:max-w-40">Нажимайте на фишки, чтобы собрать ставку.</p>
              <div className="flex gap-2 md:ml-auto">
                <Button variant="glass" icon={Trash2} aria-label="Сбросить ставку" disabled={bj.busy || bj.phase === 'settled' || bj.bet === 0} onClick={() => setBet(0)}>
                  <span className="hidden sm:inline">Сбросить</span>
                </Button>
                {bj.phase === 'settled' && (
                  <Button variant="glass" icon={RotateCcw} disabled={bj.busy} onClick={newRound}>
                    Новая ставка
                  </Button>
                )}
                <Button variant="gold" size="lg" className="flex-1 md:min-w-48" sound={false} disabled={bj.busy || bj.bet <= 0 || bj.bet > balance} onClick={onDeal}>
                  {bj.phase === 'settled' ? `Раздать ещё · ${formatChips(bj.bet)}` : 'Раздать'}
                </Button>
              </div>
            </motion.div>
          )}
          {bj.phase === 'insurance' && (
            <motion.div key="ins" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm text-slate-200">
                <Shield className="mr-1.5 inline size-4 text-sky-300" />
                У дилера туз. Застраховаться от блэкджека за {formatChips(Math.floor((bj.hands[0]?.bet ?? 0) / 2))}?
              </p>
              <div className="flex gap-2">
                <Button variant="glass" onClick={() => void resolveInsurance(false)}>
                  Без страховки
                </Button>
                <Button variant="cyan" icon={Shield} disabled={Math.floor((bj.hands[0]?.bet ?? 0) / 2) > balance} onClick={() => void resolveInsurance(true)}>
                  Застраховать
                </Button>
              </div>
            </motion.div>
          )}
          {(bj.phase === 'player' || bj.phase === 'dealing' || bj.phase === 'dealer') && (
            <motion.div key="play" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button variant="emerald" size="lg" icon={Plus} disabled={!actions.canHit} onClick={() => void hit()} sound={false}>
                Ещё
              </Button>
              <Button variant="danger" size="lg" icon={Hand} disabled={!actions.canStand} onClick={() => void stand()}>
                Хватит
              </Button>
              <Button variant="violet" size="lg" icon={Layers2} disabled={!actions.canDouble || (bj.hands[bj.active]?.bet ?? 0) > balance} onClick={() => void double()} sound={false}>
                Удвоить
              </Button>
              <Button variant="cyan" size="lg" icon={Split} disabled={!actions.canSplit || (bj.hands[bj.active]?.bet ?? 0) > balance} onClick={() => void split()} sound={false}>
                Сплит
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>
    </div>
  )
}
