import { useMemo, useState } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { useSvgId } from '../../hooks/useSvgId'
import { formatChips, formatCompact, timeAgo } from '../../lib/format'
import type { BalancePoint } from '../../store/casino'

const HEIGHT = 220
const PAD = { top: 16, right: 12, bottom: 24, left: 52 }

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const raw = (max - min) / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(v)
  return ticks
}

/**
 * Single-series balance trend: one accent line with a soft area, recessive
 * grid, and a crosshair + tooltip on hover/touch.
 */
export function BalanceChart({ points }: { points: BalancePoint[] }) {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const areaId = useSvgId('bal-area')

  const data = useMemo(() => (points.length === 1 ? [points[0], points[0]] : points), [points])

  const geom = useMemo(() => {
    const values = data.map((p) => p.balance)
    let min = Math.min(...values)
    let max = Math.max(...values)
    const spread = max - min || Math.max(1, max * 0.1)
    min = Math.max(0, min - spread * 0.1)
    max = max + spread * 0.1
    const innerW = Math.max(1, width - PAD.left - PAD.right)
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const x = (i: number) => PAD.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW)
    const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min)) * innerH
    const line = data.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join('')
    const area = `${line}L${x(data.length - 1).toFixed(1)},${PAD.top + innerH}L${PAD.left},${PAD.top + innerH}Z`
    return { x, y, line, area, ticks: niceTicks(min, max), innerW, innerH }
  }, [data, width])

  const onMove = (clientX: number, rect: DOMRect) => {
    const rel = (clientX - rect.left - PAD.left) / geom.innerW
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))))
  }

  const first = points[0]?.balance ?? 0
  const last = points[points.length - 1]?.balance ?? 0
  const hp = hover !== null ? data[hover] : null

  return (
    <div ref={ref} className="relative w-full select-none">
      <p className="sr-only">
        Графік балансу за останніми {points.length} подіями: від {formatChips(first)} до {formatChips(last)} фішок.
      </p>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          className="touch-pan-y"
          onPointerMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Динаміка балансу"
        >
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#19f5a3" stopOpacity="0.28" />
              <stop offset="1" stopColor="#19f5a3" stopOpacity="0" />
            </linearGradient>
          </defs>
          {geom.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={geom.y(t)} y2={geom.y(t)} stroke="rgba(255,255,255,0.06)" />
              <text x={PAD.left - 8} y={geom.y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[10px] tabular-nums">
                {formatCompact(t)}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={HEIGHT - 6} className="fill-slate-500 text-[10px]">
            раніше
          </text>
          <text x={width - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-slate-500 text-[10px]">
            зараз
          </text>
          <path d={geom.area} fill={`url(#${areaId})`} />
          <path d={geom.line} fill="none" stroke="#19f5a3" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hp && hover !== null && (
            <g>
              <line x1={geom.x(hover)} x2={geom.x(hover)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
              <circle cx={geom.x(hover)} cy={geom.y(hp.balance)} r="5" fill="#19f5a3" stroke="#07090d" strokeWidth="2" />
            </g>
          )}
          {!hp && <circle cx={geom.x(data.length - 1)} cy={geom.y(last)} r="4.5" fill="#19f5a3" stroke="#07090d" strokeWidth="2" />}
        </svg>
      )}
      {hp && hover !== null && (
        <div
          className="glass-strong pointer-events-none absolute top-2 z-10 rounded-xl px-3 py-2 text-xs"
          style={{
            left: Math.min(Math.max(geom.x(hover) - 70, 0), Math.max(0, width - 140)),
          }}
        >
          <p className="font-bold text-white tabular-nums">{formatChips(hp.balance)} фішок</p>
          <p className="text-slate-400">{timeAgo(hp.at)}</p>
        </div>
      )}
    </div>
  )
}
