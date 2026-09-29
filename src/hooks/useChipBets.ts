import { useCallback, useState } from 'react'
import { sfx } from '../audio/sfx'
import { toast } from '../store/toasts'
import { useCasino } from '../store/casino'

export type ChipBets<K extends string> = Partial<Record<K, number>>

export function totalOf<K extends string>(bets: ChipBets<K>): number {
  let sum = 0
  for (const v of Object.values(bets) as (number | undefined)[]) sum += v ?? 0
  return sum
}

/** Chip-on-table betting state shared by baccarat, dragon tiger and sic bo. */
export function useChipBets<K extends string>() {
  const [bets, setBets] = useState<ChipBets<K>>({})
  const [history, setHistory] = useState<ChipBets<K>[]>([])
  const [last, setLast] = useState<ChipBets<K>>({})

  const total = totalOf(bets)

  const place = useCallback(
    (key: K, amount: number) => {
      if (totalOf(bets) + amount > useCasino.getState().balance) {
        sfx.play('error')
        toast({ kind: 'warning', title: 'Недостатньо фішок', message: 'Зменште номінал фішки або заберіть бонус.' })
        return
      }
      sfx.play('chip', { pitch: 0.9 + Math.random() * 0.2 })
      setHistory((h) => [...h, bets])
      setBets((b) => ({ ...b, [key]: (b[key] ?? 0) + amount }))
    },
    [bets],
  )

  const undo = useCallback(() => {
    if (!history.length) return
    setBets(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
  }, [history])

  const clear = useCallback(() => {
    setHistory((h) => [...h, bets])
    setBets({})
  }, [bets])

  const double = useCallback(() => {
    if (totalOf(bets) * 2 > useCasino.getState().balance) {
      sfx.play('error')
      return
    }
    sfx.play('chip')
    setHistory((h) => [...h, bets])
    setBets(Object.fromEntries(Object.entries(bets).map(([k, v]) => [k, (v as number) * 2])) as ChipBets<K>)
  }, [bets])

  const rebet = useCallback(() => {
    if (totalOf(last) > useCasino.getState().balance) {
      sfx.play('error')
      toast({ kind: 'warning', title: 'Недостатньо фішок для повтору' })
      return
    }
    sfx.play('chip')
    setHistory((h) => [...h, bets])
    setBets(last)
  }, [bets, last])

  /** Remembers the current layout for «Повторить» and clears the table. */
  const commit = useCallback(() => {
    setLast(bets)
    setHistory([])
  }, [bets])

  const reset = useCallback(() => {
    setBets({})
    setHistory([])
  }, [])

  return { bets, total, history, last, place, undo, clear, double, rebet, commit, reset }
}
