export type GlyphTone = 'emerald' | 'gold' | 'cyan' | 'violet' | 'rose' | 'orange' | 'lime' | 'pink' | 'sky' | 'silver'

/** Three-stop gradients: highlight, body, shadow. */
export const GLYPH_TONES: Record<GlyphTone, readonly [string, string, string]> = {
  emerald: ['#d9fff1', '#19f5a3', '#0e9f8a'],
  gold: ['#fff6d8', '#f3c34a', '#a86f12'],
  cyan: ['#e3fcff', '#22e1ff', '#2563eb'],
  violet: ['#efe9ff', '#a78bfa', '#6d28d9'],
  rose: ['#ffe4e8', '#fb7185', '#be123c'],
  orange: ['#fff0dc', '#fb923c', '#c2410c'],
  lime: ['#f5ffe0', '#a3e635', '#15803d'],
  pink: ['#ffe6f6', '#f472d0', '#a21caf'],
  sky: ['#e6f6ff', '#38bdf8', '#1d4ed8'],
  silver: ['#ffffff', '#cbd5e1', '#64748b'],
}
