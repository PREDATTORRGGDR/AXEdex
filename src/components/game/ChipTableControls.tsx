import { Layers2, Repeat, Trash2, Undo2, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatChips } from '../../lib/format'
import { useCasino } from '../../store/casino'
import { Button } from '../ui/Button'
import { ChipSelector } from '../ui/CasinoChip'
import { Panel } from '../ui/Panel'

interface ChipTableControlsProps {
  chip: number
  onChip: (v: number) => void
  total: number
  lastWin: number
  busy: boolean
  canUndo: boolean
  canRebet: boolean
  onUndo: () => void
  onClear: () => void
  onDouble: () => void
  onRebet: () => void
  actionLabel: string
  busyLabel: string
  actionIcon: LucideIcon
  onAction: () => void
  className?: string
}

/**
 * Chip rack, stake read-out and the undo / clear / double / repeat / play row.
 * Compact on phones so the sticky panel never buries the table.
 */
export function ChipTableControls(p: ChipTableControlsProps) {
  const balance = useCasino((s) => s.balance)
  const tools = '!h-10 !w-10 !px-0 sm:!h-11 sm:!w-auto sm:!px-4'
  return (
    <Panel strong className={cn('z-20 space-y-2.5 p-2.5 sm:space-y-3 sm:p-4 lg:sticky lg:bottom-4', p.className)}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
        <ChipSelector value={p.chip} onChange={p.onChip} balance={balance} className="md:w-auto" />
        <div className="flex items-center justify-between gap-4 px-1 text-xs md:justify-end md:gap-5 md:px-0 md:text-right">
          <p className="flex items-baseline gap-1.5 md:flex-col md:items-end md:gap-0">
            <span className="text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">Ставка</span>
            <span className="num text-sm font-bold text-white md:text-lg">{formatChips(p.total)}</span>
          </p>
          <p className="flex items-baseline gap-1.5 md:flex-col md:items-end md:gap-0">
            <span className="text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">Останній виграш</span>
            <span className={cn('num text-sm font-bold md:text-lg', p.lastWin > 0 ? 'text-neon-emerald' : 'text-slate-500')}>{formatChips(p.lastWin)}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-1.5 sm:grid sm:grid-cols-[repeat(4,auto)_1fr] sm:gap-2">
        <Button variant="glass" icon={Undo2} className={tools} aria-label="Скасувати" title="Скасувати" disabled={p.busy || !p.canUndo} onClick={p.onUndo}>
          <span className="hidden xl:inline">Скасувати</span>
        </Button>
        <Button variant="glass" icon={Trash2} className={tools} aria-label="Очистити" title="Очистити" disabled={p.busy || !p.total} onClick={p.onClear}>
          <span className="hidden xl:inline">Очистити</span>
        </Button>
        <Button variant="glass" icon={Layers2} className={tools} aria-label="Подвоїти" title="Подвоїти" sound={false} disabled={p.busy || !p.total} onClick={p.onDouble}>
          <span className="hidden xl:inline">Подвоїти</span>
        </Button>
        <Button variant="glass" icon={Repeat} className={tools} aria-label="Повторити" title="Повторити" sound={false} disabled={p.busy || !!p.total || !p.canRebet} onClick={p.onRebet}>
          <span className="hidden xl:inline">Повторити</span>
        </Button>
        <Button
          variant="emerald"
          size="lg"
          icon={p.actionIcon}
          sound={false}
          className="!h-10 min-w-0 flex-1 overflow-hidden !px-3 sm:!h-12 sm:!px-5"
          disabled={p.busy || p.total <= 0 || p.total > balance}
          onClick={p.onAction}
        >
          <span className="truncate">{p.busy ? p.busyLabel : p.actionLabel}</span>
        </Button>
      </div>
    </Panel>
  )
}
