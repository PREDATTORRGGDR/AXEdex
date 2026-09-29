import { useRef } from 'react'
import { haptic, sfx } from '../../audio/sfx'
import { useCasino } from '../../store/casino'
import { celebrate } from '../../store/fx'
import { toast } from '../../store/toasts'

const TAPS = 5
const WINDOW_MS = 3000

/**
 * «Зроблено by kyrapyto». The name is a secret button: five quick taps
 * credit 1 000 chips.
 */
export function SecretCredit({ prefix = 'Зроблено by' }: { prefix?: string }) {
  const taps = useRef<number[]>([])
  const onTap = () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now]
    if (taps.current.length < TAPS) return
    taps.current = []
    const amount = useCasino.getState().claimSecretBonus()
    sfx.play('cashout')
    haptic([20, 30, 20, 30, 40])
    celebrate('coins', 1.5)
    toast({ kind: 'bonus', title: 'Секретний бонус!', message: 'Привіт від kyrapyto.', amount, icon: 'money-bag' })
  }
  return (
    <>
      {prefix}{' '}
      <button type="button" onClick={onTap} className="cursor-text font-display font-bold text-gold-gradient select-none">
        kyrapyto
      </button>
    </>
  )
}
