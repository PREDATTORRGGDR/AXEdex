import { secureRandom, weightedPick, type Rng } from '../../lib/rng'

export const REELS = 5
export const ROWS = 3

export type SymbolId = 'cherry' | 'lemon' | 'grape' | 'clover' | 'bell' | 'gem' | 'crown' | 'seven' | 'wild' | 'scatter'

export const SYMBOLS: readonly SymbolId[] = ['cherry', 'lemon', 'grape', 'clover', 'bell', 'gem', 'crown', 'seven', 'wild', 'scatter']

export const SYMBOL_NAMES: Record<SymbolId, string> = {
  cherry: 'Вишня',
  lemon: 'Лимон',
  grape: 'Виноград',
  clover: 'Конюшина',
  bell: 'Дзвін',
  gem: 'Діамант',
  crown: 'Корона',
  seven: 'Сімка',
  wild: 'Зірка (вайлд)',
  scatter: 'Бонус (скатер)',
}

/** Relative frequency of each symbol per cell. */
export const WEIGHTS: Record<SymbolId, number> = {
  cherry: 20,
  lemon: 18,
  grape: 16,
  clover: 13,
  bell: 10,
  gem: 7,
  crown: 5,
  seven: 3,
  wild: 2.4,
  scatter: 3.1,
}

/** Line pays in multiples of the line bet for 3, 4 and 5 of a kind. */
export const PAYTABLE: Record<Exclude<SymbolId, 'scatter'>, [number, number, number]> = {
  cherry: [10, 25, 80],
  lemon: [12, 30, 100],
  grape: [15, 40, 125],
  clover: [20, 50, 200],
  bell: [25, 75, 250],
  gem: [40, 125, 500],
  crown: [60, 200, 1000],
  seven: [120, 500, 2500],
  wild: [250, 1000, 5000],
}

/** Scatter pays in multiples of the TOTAL bet, anywhere on the screen. */
export const SCATTER_PAYS: Record<number, number> = { 3: 2, 4: 10, 5: 50 }
export const FREE_SPINS_AWARD = 10
export const FREE_SPINS_RETRIGGER = 5
export const FREE_SPINS_MULTIPLIER = 2
export const MAX_FREE_SPINS = 50

/** Row index per reel for each of the 10 paylines. */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 0, 1, 0],
]
export const LINES = PAYLINES.length

/** grid[reel][row] */
export type Grid = SymbolId[][]

export interface LineWin {
  line: number
  symbol: SymbolId
  count: number
  cells: [reel: number, row: number][]
  win: number
}

export interface SpinOutcome {
  grid: Grid
  lineWins: LineWin[]
  scatterCells: [number, number][]
  scatterWin: number
  /** Total win of this spin (multiplier applied). */
  win: number
  freeSpinsAwarded: number
  multiplier: number
}

export interface SpinSequence {
  base: SpinOutcome
  freeSpins: SpinOutcome[]
  totalWin: number
}

export function randomSymbol(rng: Rng = secureRandom): SymbolId {
  return weightedPick(SYMBOLS, SYMBOLS.map((s) => WEIGHTS[s]), rng)
}

export function randomGrid(rng: Rng = secureRandom): Grid {
  return Array.from({ length: REELS }, () => {
    const reel: SymbolId[] = []
    for (let r = 0; r < ROWS; r++) {
      let s = randomSymbol(rng)
      // At most one scatter per reel.
      while (s === 'scatter' && reel.includes('scatter')) s = randomSymbol(rng)
      reel.push(s)
    }
    return reel
  })
}

export function evaluateLine(grid: Grid, lineIndex: number, lineBet: number): LineWin | null {
  const rows = PAYLINES[lineIndex]
  const symbols = rows.map((row, reel) => grid[reel][row])
  if (symbols[0] === 'scatter') return null

  let leadingWilds = 0
  while (leadingWilds < REELS && symbols[leadingWilds] === 'wild') leadingWilds++

  const target = symbols.find((s) => s !== 'wild')
  let count = 0
  if (target && target !== 'scatter') {
    while (count < REELS && (symbols[count] === target || symbols[count] === 'wild')) count++
  }

  const symbolPay = target && target !== 'scatter' && count >= 3 ? PAYTABLE[target][count - 3] : 0
  const wildPay = leadingWilds >= 3 ? PAYTABLE.wild[leadingWilds - 3] : 0
  if (symbolPay === 0 && wildPay === 0) return null

  const useWild = wildPay >= symbolPay
  const n = useWild ? leadingWilds : count
  return {
    line: lineIndex,
    symbol: useWild ? 'wild' : (target as SymbolId),
    count: n,
    cells: rows.slice(0, n).map((row, reel) => [reel, row]),
    win: (useWild ? wildPay : symbolPay) * lineBet,
  }
}

export function evaluateGrid(grid: Grid, lineBet: number, multiplier = 1, inFreeSpins = false): SpinOutcome {
  const lineWins: LineWin[] = []
  for (let i = 0; i < LINES; i++) {
    const w = evaluateLine(grid, i, lineBet)
    if (w) lineWins.push({ ...w, win: w.win * multiplier })
  }
  const scatterCells: [number, number][] = []
  grid.forEach((reel, r) => reel.forEach((s, row) => s === 'scatter' && scatterCells.push([r, row])))
  const scatterWin = (SCATTER_PAYS[scatterCells.length] ?? 0) * lineBet * LINES * multiplier
  const triggered = scatterCells.length >= 3
  const freeSpinsAwarded = triggered ? (inFreeSpins ? FREE_SPINS_RETRIGGER : FREE_SPINS_AWARD) : 0
  const win = lineWins.reduce((sum, w) => sum + w.win, 0) + scatterWin
  return { grid, lineWins, scatterCells, scatterWin, win, freeSpinsAwarded, multiplier }
}

/** Plays one paid spin, including every free spin it triggers. */
export function playSpin(lineBet: number, rng: Rng = secureRandom): SpinSequence {
  const base = evaluateGrid(randomGrid(rng), lineBet)
  const freeSpins: SpinOutcome[] = []
  let remaining = base.freeSpinsAwarded
  let awarded = remaining
  while (remaining > 0) {
    remaining--
    const spin = evaluateGrid(randomGrid(rng), lineBet, FREE_SPINS_MULTIPLIER, true)
    freeSpins.push(spin)
    if (spin.freeSpinsAwarded && awarded < MAX_FREE_SPINS) {
      const extra = Math.min(spin.freeSpinsAwarded, MAX_FREE_SPINS - awarded)
      awarded += extra
      remaining += extra
    }
  }
  const totalWin = base.win + freeSpins.reduce((sum, s) => sum + s.win, 0)
  return { base, freeSpins, totalWin }
}
