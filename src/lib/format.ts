/**
 * Formatting helpers. The UI is Ukrainian-only, so every formatter uses the
 * uk-UA locale (space-grouped thousands, decimal comma).
 */
const LOCALE = 'uk-UA'

const whole = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const compactFmt = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })
const fixedFmts = new Map<number, Intl.NumberFormat>()

function fixed(value: number, digits: number): string {
  let fmt = fixedFmts.get(digits)
  if (!fmt) {
    fmt = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    fixedFmts.set(digits, fmt)
  }
  return fmt.format(value)
}

/** 12345.6 -> "12 346" */
export function formatChips(value: number): string {
  return whole.format(Math.round(value))
}

/** 12345 -> "12,3 тис." (values under 10 000 stay exact). */
export function formatCompact(value: number): string {
  return Math.abs(value) < 10_000 ? formatChips(value) : compactFmt.format(value)
}

/** 250 -> "+250", -40 -> "−40" (true minus sign). */
export function formatSigned(value: number): string {
  if (value > 0) return `+${formatChips(value)}`
  if (value < 0) return `−${formatChips(Math.abs(value))}`
  return '0'
}

/** 2.5 -> "2,50×" */
export function formatMultiplier(value: number, digits = 2): string {
  return `${fixed(value, digits)}×`
}

/** 0.973 -> "97,3%" */
export function formatPercent(value: number, digits = 0): string {
  return `${fixed(value * 100, digits)}%`
}

export function formatDecimal(value: number, digits = 2): string {
  return fixed(value, digits)
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Ukrainian plural form picker: plural(5, ['раунд', 'раунди', 'раундів']). */
export function plural(n: number, forms: readonly [one: string, few: string, many: string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp)
  const s = Math.floor(diff / 1000)
  if (s < 45) return 'щойно'
  const m = Math.floor(s / 60)
  if (m < 60) return `${Math.max(1, m)} хв тому`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} год тому`
  return `${Math.floor(h / 24)} д тому`
}
