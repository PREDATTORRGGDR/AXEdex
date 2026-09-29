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
}

/** Chip rack, stake read-out and the undo / clear / double / repeat / play row. */
export function ChipTableControls(p: ChipTableControlsProps) {
  const balance = useCasino((s) => s.balance)
  return (
    <Panel strong className="sticky bottom-[76px] z-20 space-y-3 p-3 sm:p-4 lg:bottom-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <ChipSelector value={p.chip} onChange={p.onChip} balance={balance} />
        <div className="flex gap-5 text-right">
          <div>
            <p className="text-[11px] text-slate-400">Ставка</p>
            <p className="text-lg font-bold text-white tabular-nums">{formatChips(p.total)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Последний выигрыш</p>
            <p className={cn('text-lg font-bold tabular-nums', p.lastWin > 0 ? 'text-emerald-300' : 'text-slate-400')}>{formatChips(p.lastWin)}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(4,auto)_1fr] gap-2">
        <Button variant="glass" icon={Undo2} aria-label="Отменить" disabled={p.busy || !p.canUndo} onClick={p.onUndo}>
          <span className="hidden sm:inline">Отменить</span>
        </Button>
        <Button variant="glass" icon={Trash2} aria-label="Очистить" disabled={p.busy || !p.total} onClick={p.onClear}>
          <span className="hidden sm:inline">Очистить</span>
        </Button>
        <Button variant="glass" icon={Layers2} aria-label="Удвоить" sound={false} disabled={p.busy || !p.total} onClick={p.onDouble}>
          <span className="hidden sm:inline">Удвоить</span>
        </Button>
        <Button variant="glass" icon={Repeat} aria-label="Повторить" sound={false} disabled={p.busy || !!p.total || !p.canRebet} onClick={p.onRebet}>
          <span className="hidden sm:inline">Повторить</span>
        </Button>
        <Button variant="gold" size="lg" icon={p.actionIcon} sound={false} disabled={p.busy || p.total <= 0 || p.total > balance} onClick={p.onAction}>
          {p.busy ? p.busyLabel : p.actionLabel}
        </Button>
      </div>
    </Panel>
  )
}
