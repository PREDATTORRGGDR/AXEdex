import { canRefill, getDailyStatus, getFaucetStatus, useCasino } from '../store/casino'
import { useNow } from './useNow'

/** True when any free-chip source can be claimed right now. */
export function useHasClaimable(): boolean {
  const now = useNow(5000)
  const daily = useCasino((s) => s.daily)
  const faucetAt = useCasino((s) => s.faucetLastClaimAt)
  const xp = useCasino((s) => s.xp)
  const balance = useCasino((s) => s.balance)
  return getDailyStatus(daily, now).available || getFaucetStatus(faucetAt, xp, now).available || canRefill({ balance })
}
