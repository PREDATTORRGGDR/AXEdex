import { formatDecimal } from '../../lib/format'
import { GROWTH } from './logic'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
}

export interface Star {
  x: number
  y: number
  z: number
}

export interface SceneState {
  /** Seconds of flight. */
  t: number
  m: number
  crashed: boolean
  cashedAt: number | null
  trail: Particle[]
  sparks: Particle[]
  stars: Star[]
}

export const PAD = { left: 46, right: 18, top: 18, bottom: 28 }

export function createStars(count = 70): Star[] {
  return Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8 }))
}

function niceStep(range: number, target = 4): number {
  const raw = range / target
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= raw) return m * mag
  return 10 * mag
}

export interface Geometry {
  x: (sec: number) => number
  y: (mult: number) => number
  xMax: number
  yMax: number
}

export function geometry(w: number, h: number, t: number, m: number): Geometry {
  const xMax = Math.max(8, t * 1.18)
  const yMax = Math.max(2, 1 + (m - 1) * 1.3)
  const iw = w - PAD.left - PAD.right
  const ih = h - PAD.top - PAD.bottom
  return {
    xMax,
    yMax,
    x: (sec) => PAD.left + (sec / xMax) * iw,
    y: (mult) => PAD.top + ih - ((mult - 1) / (yMax - 1)) * ih,
  }
}

/** Renders one frame of the flight chart. Returns the tip position and heading. */
export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, s: SceneState, dt: number) {
  const g = geometry(w, h, s.t, s.m)
  ctx.clearRect(0, 0, w, h)

  // Parallax stars (they rush past faster as the multiplier climbs).
  const speed = s.crashed ? 0.02 : 0.05 + Math.min(1.5, Math.log(s.m) * 0.35)
  for (const star of s.stars) {
    if (s.t > 0) {
      star.x -= speed * star.z * dt * 0.25
      star.y += speed * star.z * dt * 0.12
      if (star.x < 0) star.x += 1
      if (star.y > 1) star.y -= 1
    }
    ctx.fillStyle = `rgba(200, 220, 255, ${0.15 + star.z * 0.45})`
    ctx.fillRect(star.x * w, star.y * h, star.z * 1.8, star.z * 1.8)
  }

  // Grid + labels
  ctx.font = '600 10px Inter, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  const yStep = niceStep(g.yMax - 1)
  for (let v = 1; v <= g.yMax + 1e-9; v += yStep) {
    const y = g.y(v)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.moveTo(PAD.left, y)
    ctx.lineTo(w - PAD.right, y)
    ctx.stroke()
    ctx.fillStyle = 'rgba(148,163,184,0.8)'
    ctx.textAlign = 'right'
    ctx.fillText(`${formatDecimal(v, v < 10 ? 1 : 0)}×`, PAD.left - 6, y)
  }
  const xStep = niceStep(g.xMax, 5)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let v = 0; v <= g.xMax + 1e-9; v += xStep) {
    ctx.fillStyle = 'rgba(148,163,184,0.6)'
    ctx.fillText(`${Math.round(v)} с`, g.x(v), h - PAD.bottom + 8)
  }

  if (s.t <= 0) return { x: g.x(0), y: g.y(1), angle: -0.3 }

  // Curve
  const steps = 90
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const tt = (s.t * i) / steps
    pts.push([g.x(tt), g.y(Math.min(s.m, Math.exp(GROWTH * tt)))])
  }
  const [tipX, tipY] = pts[pts.length - 1]
  const color = s.crashed ? '#ff4d6d' : s.cashedAt ? '#34f5a0' : '#22d3ee'

  const area = ctx.createLinearGradient(0, tipY, 0, h - PAD.bottom)
  area.addColorStop(0, s.crashed ? 'rgba(255,77,109,0.35)' : 'rgba(34,211,238,0.3)')
  area.addColorStop(1, 'rgba(34,211,238,0)')
  ctx.beginPath()
  ctx.moveTo(pts[0][0], h - PAD.bottom)
  for (const [x, y] of pts) ctx.lineTo(x, y)
  ctx.lineTo(tipX, h - PAD.bottom)
  ctx.closePath()
  ctx.fillStyle = area
  ctx.fill()

  const stroke = ctx.createLinearGradient(PAD.left, 0, tipX, 0)
  stroke.addColorStop(0, s.crashed ? '#7f1d1d' : '#0e7490')
  stroke.addColorStop(1, color)
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.strokeStyle = stroke
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.shadowColor = color
  ctx.shadowBlur = 16
  ctx.stroke()
  ctx.shadowBlur = 0

  // Cash-out marker
  if (s.cashedAt) {
    const tc = Math.log(s.cashedAt) / GROWTH
    const cx = g.x(tc)
    const cy = g.y(s.cashedAt)
    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#34f5a0'
    ctx.shadowColor = '#34f5a0'
    ctx.shadowBlur = 14
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#a7ffd9'
    ctx.font = '800 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${formatDecimal(s.cashedAt)}×`, cx, cy - 10)
  }

  const [px, py] = pts[pts.length - 4] ?? pts[0]
  const angle = Math.atan2(tipY - py, tipX - px)

  // Exhaust trail
  if (!s.crashed) {
    for (let i = 0; i < 3; i++) {
      s.trail.push({
        x: tipX - Math.cos(angle) * 14,
        y: tipY - Math.sin(angle) * 14,
        vx: -Math.cos(angle) * (1 + Math.random() * 1.5) + (Math.random() - 0.5) * 0.8,
        vy: -Math.sin(angle) * (1 + Math.random() * 1.5) + (Math.random() - 0.5) * 0.8,
        life: 0,
        max: 20 + Math.random() * 20,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.5 ? '255,180,60' : '255,90,60',
      })
    }
  }
  drawParticles(ctx, s.trail, dt)
  drawParticles(ctx, s.sparks, dt)

  return { x: tipX, y: tipY, angle }
}

function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]
    p.life += dt
    if (p.life >= p.max) {
      list.splice(i, 1)
      continue
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 0.02 * dt
    const a = 1 - p.life / p.max
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${p.color},${a})`
    ctx.fill()
  }
}

export function explode(s: SceneState, x: number, y: number) {
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2
    const v = 1 + Math.random() * 6
    s.sparks.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0,
      max: 30 + Math.random() * 40,
      size: 2 + Math.random() * 4,
      color: ['255,77,109', '255,180,60', '255,236,150', '255,120,60'][i % 4],
    })
  }
}
