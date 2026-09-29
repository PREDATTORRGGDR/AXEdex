/** Chip denominations and their colors, shared by every table game. */
export const CHIP_VALUES = [10, 25, 100, 500, 1_000, 5_000] as const

interface ChipStyle {
  base: string
  edge: string
  ink: string
}

const CHIP_STYLES: Record<number, ChipStyle> = {
  10: { base: '#2563eb', edge: '#dbeafe', ink: '#ffffff' },
  25: { base: '#059669', edge: '#d1fae5', ink: '#ffffff' },
  100: { base: '#111827', edge: '#fcd96b', ink: '#fcd96b' },
  500: { base: '#7c3aed', edge: '#ede9fe', ink: '#ffffff' },
  1000: { base: '#d4a017', edge: '#fff4d1', ink: '#1f1400' },
  5000: { base: '#db2777', edge: '#fce7f3', ink: '#ffffff' },
}

export function chipStyle(value: number): ChipStyle {
  let best = CHIP_STYLES[10]
  for (const v of CHIP_VALUES) if (value >= v) best = CHIP_STYLES[v]
  return best
}

/** Short label that fits on a chip face: 2500 -> "2500", 12 000 -> "12к", 1 500 000 -> "1,5м". */
export function chipLabel(amount: number): string {
  if (amount < 10_000) return String(Math.round(amount))
  if (amount < 1_000_000) return `${Math.round(amount / 1000)}к`
  return `${(amount / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')}м`
}
