import { beforeEach, describe, expect, it } from 'vitest'
import {
  BANKRUPT_AID,
  BANKRUPT_COOLDOWN_MS,
  DAILY_COOLDOWN_MS,
  dailyBonusAmount,
  getDailyStatus,
  getRefillStatus,
  STARTING_BALANCE,
  useCasino,
} from './casino'
import { TIER_REWARD } from './achievements'
import { levelFromXp, levelUpReward } from './progression'

const s = () => useCasino.getState()

beforeEach(() => {
  s().resetProgress()
})

describe('round ledger', () => {
  it('debits on start and credits on finish', () => {
    const id = s().startRound('roulette', 100)!
    expect(s().balance).toBe(STARTING_BALANCE - 100)
    const rec = s().finishRound(id, { payout: 250, detail: 'test' })!
    expect(rec.net).toBe(150)
    // +50 for the first-round achievement.
    expect(s().balance).toBe(STARTING_BALANCE + 150 + TIER_REWARD.bronze)
    expect(s().lifetime.rounds).toBe(1)
    expect(s().games.roulette?.wins).toBe(1)
  })

  it('refuses wagers above the balance and cannot finish twice', () => {
    expect(s().startRound('slots', STARTING_BALANCE + 1)).toBeNull()
    const id = s().startRound('slots', 10)!
    expect(s().finishRound(id, { payout: 0 })).not.toBeNull()
    expect(s().finishRound(id, { payout: 1000 })).toBeNull()
  })

  it('raises an open round and settles interrupted rounds with their fallback', () => {
    const id = s().startRound('blackjack', 100)!
    expect(s().raiseRound(id, 100)).toBe(true)
    expect(s().openRounds[0].wager).toBe(200)
    const fb = s().startRound('crash', 50, { payout: 100 })!
    s().recoverRounds()
    expect(s().openRounds.map((r) => r.id)).toEqual([id])
    expect(s().games.crash?.returned).toBe(100)
    expect(fb).toBeTruthy()
  })

  it('refunds cancelled rounds without recording them', () => {
    const id = s().startRound('mines', 40)!
    s().cancelRound(id)
    expect(s().balance).toBe(STARTING_BALANCE)
    expect(s().lifetime.rounds).toBe(0)
  })
})

describe('free chips are scarce', () => {
  it('pays a modest daily bonus that grows with the streak', () => {
    expect(dailyBonusAmount(1)).toBe(100)
    expect(dailyBonusAmount(7)).toBe(400)
    expect(dailyBonusAmount(30)).toBe(400)
    const t0 = 1_000_000_000_000
    expect(s().claimDailyBonus(t0)).toBe(100)
    expect(s().claimDailyBonus(t0 + 1000)).toBe(0)
    expect(s().claimDailyBonus(t0 + DAILY_COOLDOWN_MS)).toBe(150)
    // Missing more than 48 h resets the streak.
    expect(getDailyStatus(s().daily, t0 + DAILY_COOLDOWN_MS * 4).nextStreakDay).toBe(1)
  })

  it('only helps a broke player, and only once per cooldown', () => {
    expect(s().claimRefill()).toBe(0)
    const id = s().startRound('dice', s().balance)!
    s().finishRound(id, { payout: 0 })
    // The first-round achievement pays a little; burn it too.
    const id2 = s().startRound('dice', s().balance)!
    s().finishRound(id2, { payout: 0 })
    const now = Date.now()
    expect(getRefillStatus(s(), now).available).toBe(true)
    expect(s().claimRefill(now)).toBe(BANKRUPT_AID)
    const id3 = s().startRound('dice', s().balance)!
    s().finishRound(id3, { payout: 0 })
    expect(s().claimRefill(now + 1000)).toBe(0)
    expect(getRefillStatus(s(), now + 1000).nextAt).toBe(now + BANKRUPT_COOLDOWN_MS)
    expect(s().claimRefill(now + BANKRUPT_COOLDOWN_MS)).toBe(BANKRUPT_AID)
  })

  it('keeps level-up rewards small', () => {
    expect(levelUpReward(2)).toBe(40)
    expect(levelUpReward(10)).toBe(200)
    expect(levelFromXp(0).level).toBe(1)
  })
})
