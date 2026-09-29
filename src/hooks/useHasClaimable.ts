import { getDailyStatus, getRefillStatus, useCasino } from '../store/casino'
import { useNow } from './useNow'

/** True when the daily bonus or bankruptcy aid can be claimed right now. */
export function useHasClaimable(): boolean {
  const now = useNow(5000)
  const daily = useCasino((s) => s.daily)
  const balance = useCasino((s) => s.balance)
  const openRounds = useCasino((s) => s.openRounds)
  const refillLastAt = useCasino((s) => s.refillLastAt)
  return getDailyStatus(daily, now).available || getRefillStatus({ balance, openRounds, refillLastAt }, now).available
}
