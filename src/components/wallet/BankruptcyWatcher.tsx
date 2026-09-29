import { useEffect, useRef } from 'react'
import { formatDuration } from '../../lib/format'
import { BANKRUPT_THRESHOLD, getRefillStatus, useCasino } from '../../store/casino'
import { toast } from '../../store/toasts'

/** Tells the player, once, when their last chips are gone and when the bank will help. */
export function BankruptcyWatcher() {
  const balance = useCasino((s) => s.balance)
  const openCount = useCasino((s) => s.openRounds.length)
  const wasBroke = useRef(balance < BANKRUPT_THRESHOLD)

  useEffect(() => {
    const broke = balance < BANKRUPT_THRESHOLD && openCount === 0
    if (broke && !wasBroke.current) {
      const status = getRefillStatus(useCasino.getState())
      toast({
        kind: 'warning',
        title: 'Фишки закончились',
        message: status.available
          ? 'Загляните в «Бонусы»: банк поможет, но только раз в 8 часов.'
          : `Помощь банка будет доступна через ${formatDuration(status.nextAt - Date.now())}.`,
      })
    }
    wasBroke.current = broke
  }, [balance, openCount])

  return null
}
