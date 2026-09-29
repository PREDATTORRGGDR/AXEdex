/** Chip denominations and their colours, shared by every table game. */
export const CHIP_VALUES = [1, 5, 10, 25, 100, 500] as const

export interface ChipStyle {
  /** Face colour. */
  base: string
  /** Darker rim that reads as the chip's thickness. */
  side: string
  /** Edge inserts and inlay ring. */
  edge: string
  ink: string
}

const CHIP_STYLES: Record<number, ChipStyle> = {
  1: { base: '#c7cfda', side: '#5d6776', edge: '#1b2230', ink: '#0b0e14' },
  5: { base: '#d61f43', side: '#6e0a1e', edge: '#ffe3e9', ink: '#ffffff' },
  10: { base: '#1591d6', side: '#083f63', edge: '#dcf6ff', ink: '#ffffff' },
  25: { base: '#0cbf7e', side: '#04583a', edge: '#e2fff3', ink: '#ffffff' },
  100: { base: '#161b25', side: '#030406', edge: '#e6c26a', ink: '#f3dc9a' },
  500: { base: '#7446f0', side: '#321680', edge: '#efe9ff', ink: '#ffffff' },
  1000: { base: '#dcaa41', side: '#6a470c', edge: '#fff4d1', ink: '#1b1204' },
  5000: { base: '#e0307f', side: '#6f0f3b', edge: '#ffe4f1', ink: '#ffffff' },
}

const STYLE_STEPS = [1, 5, 10, 25, 100, 500, 1000, 5000]

export function chipStyle(value: number): ChipStyle {
  let best = CHIP_STYLES[1]
  for (const v of STYLE_STEPS) if (value >= v) best = CHIP_STYLES[v]
  return best
}

/** Short label that fits on a chip face: 2500 -> "2500", 12 000 -> "12к", 1 500 000 -> "1,5м". */
export function chipLabel(amount: number): string {
  if (amount < 10_000) return String(Math.round(amount))
  if (amount < 1_000_000) return `${Math.round(amount / 1000)}к`
  return `${(amount / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')}м`
}
