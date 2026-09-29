import type { BonusType } from './logic'

/**
 * Canvas side-view of the flight: night sky, neon sea, the launch and landing
 * carriers, bonus tokens, rockets, the cyber jet and particle effects. Pure
 * drawing — the game component owns all timing and outcome logic and only
 * passes positions in.
 */

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  /** Pulls the particle down (px/s²). */
  gravity?: number
}

interface Cloud {
  x: number
  y: number
  w: number
  depth: number
}

export interface PlanePose {
  x: number
  y: number
  angle: number
  visible: boolean
  /** Engine flame length, 0..1. */
  flame: number
  hook: boolean
}

/** Floating «+0,5×» style label. */
export interface Popup {
  x: number
  y: number
  text: string
  color: string
  life: number
}

/** A bonus or rocket placed in screen space for this frame. */
export interface Token {
  x: number
  y: number
  bonus: BonusType
}

export interface Ship {
  x: number
  len: number
}

export interface CarrierScene {
  w: number
  h: number
  /** Animation clock, seconds. */
  t: number
  /** Parallax speed in px/s. */
  speed: number
  scroll: number
  plane: PlanePose
  /** Every carrier in view: stern x and hull length. */
  fleet: Ship[]
  /** Index of the carrier the jet is heading for (its deck glows), or -1. */
  focus: number
  /** Touchdown zone highlight of the focused carrier, 0..1. */
  zoneGlow: number
  particles: Particle[]
  popups: Popup[]
  clouds: Cloud[]
}

export function geometry(w: number, h: number) {
  const seaY = Math.round(h * 0.8)
  const deckY = Math.round(seaY - h * 0.05)
  const scale = h / 320
  /** Typical carrier length; each ship in the flotilla is 0.6–1.35× this. */
  const length = Math.round(Math.max(150, Math.min(w * 0.3, 340)))
  return {
    seaY,
    deckY,
    length,
    scale,
    planeX: Math.round(w * 0.3),
    /** Vertical offset of the jet's centre above the deck when it sits on it. */
    rideHeight: 9 * scale,
    /** Touchdown zone centre of a ship `len` long, measured from its stern. */
    zoneCenter: (len: number) => len * 0.26,
    zoneHalf: (len: number) => len * 0.11,
    /** Smallest stretch of open water between two carriers. */
    minGap: Math.max(w * 0.22, 130 * scale),
  }
}

export function createScene(w: number, h: number, home?: Ship): CarrierScene {
  const g = geometry(w, h)
  const base = home ?? { x: g.planeX - g.length * 0.3, len: g.length }
  const clouds: Cloud[] = Array.from({ length: 7 }, (_, i) => ({
    x: (i / 7) * w * 1.3,
    y: h * (0.08 + Math.random() * 0.45),
    w: 60 + Math.random() * 140,
    depth: 0.25 + Math.random() * 0.75,
  }))
  return {
    w,
    h,
    t: 0,
    speed: 0,
    scroll: 0,
    plane: { x: base.x + base.len * 0.3, y: g.deckY - g.rideHeight, angle: 0, visible: true, flame: 0.2, hook: false },
    fleet: idleFleet(w, h, base),
    focus: -1,
    zoneGlow: 0,
    particles: [],
    popups: [],
    clouds,
  }
}

const STARS = Array.from({ length: 46 }, () => [Math.random(), Math.random() * 0.55, Math.random()] as const)

function drawSky(ctx: CanvasRenderingContext2D, s: CarrierScene, seaY: number) {
  const { w, h } = s
  const sky = ctx.createLinearGradient(0, 0, 0, seaY)
  sky.addColorStop(0, '#05070b')
  sky.addColorStop(0.55, '#08111a')
  sky.addColorStop(1, '#0c2230')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, seaY)

  // Stars drift slowly with the flight.
  for (const [sx, sy, tw] of STARS) {
    const x = (((sx * w - s.scroll * 0.05) % w) + w) % w
    ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(s.t * 1.6 + tw * 20))
    ctx.fillStyle = '#cfe9ff'
    ctx.fillRect(x, sy * h, 1.3, 1.3)
  }
  ctx.globalAlpha = 1

  // Horizon glow.
  const glow = ctx.createLinearGradient(0, seaY - h * 0.22, 0, seaY)
  glow.addColorStop(0, 'rgba(34,225,255,0)')
  glow.addColorStop(1, 'rgba(34,225,255,0.14)')
  ctx.fillStyle = glow
  ctx.fillRect(0, seaY - h * 0.22, w, h * 0.22)

  // Clouds as soft streaks; faster ones feel closer.
  for (const c of s.clouds) {
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.w * 0.5)
    g.addColorStop(0, `rgba(160,190,220,${0.05 + c.depth * 0.06})`)
    g.addColorStop(1, 'rgba(160,190,220,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(c.x, c.y, c.w * 0.5, c.w * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawSea(ctx: CanvasRenderingContext2D, s: CarrierScene, seaY: number) {
  const { w, h } = s
  const sea = ctx.createLinearGradient(0, seaY, 0, h)
  sea.addColorStop(0, '#07202a')
  sea.addColorStop(1, '#020508')
  ctx.fillStyle = sea
  ctx.fillRect(0, seaY, w, h - seaY)
  ctx.strokeStyle = 'rgba(34,225,255,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, seaY)
  ctx.lineTo(w, seaY)
  ctx.stroke()
  for (let row = 0; row < 4; row++) {
    const y = seaY + 7 + row * ((h - seaY) / 4.2)
    ctx.strokeStyle = `rgba(34,225,255,${0.2 - row * 0.04})`
    ctx.beginPath()
    for (let x = 0; x <= w; x += 8) {
      const yy = y + Math.sin(x * 0.045 + s.t * (1.4 + row * 0.3) + s.scroll * 0.02 * (row + 1)) * (1.5 + row * 0.6)
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
}

/** Random ship length around the typical size. */
export function shipLength(base: number, rng: () => number = Math.random): number {
  return Math.round(base * (0.6 + rng() * 0.75))
}

/** A flotilla filling the view around the ship the jet is parked on. */
export function idleFleet(w: number, h: number, home: Ship): Ship[] {
  const g = geometry(w, h)
  const fleet: Ship[] = [home]
  let left = home.x
  while (left > -g.length * 1.5) {
    const len = shipLength(g.length)
    left -= g.minGap * (1 + Math.random() * 0.7) + len
    fleet.unshift({ x: left, len })
  }
  let right = home.x + home.len
  while (right < w + g.length) {
    const len = shipLength(g.length)
    right += g.minGap * (1 + Math.random() * 0.7)
    fleet.push({ x: right, len })
    right += len
  }
  return fleet
}

function drawCarrier(ctx: CanvasRenderingContext2D, s: CarrierScene, stern: number, L: number, focused: boolean) {
  const g = geometry(s.w, s.h)
  const { seaY, deckY, scale } = g
  const zoneCenter = g.zoneCenter(L)
  const zoneHalf = g.zoneHalf(L)
  const size = Math.pow(L / g.length, 0.6)
  if (stern > s.w + 10 || stern + L < -10) return
  const bow = stern + L
  const hullBottom = seaY + 7 * scale

  // Wake behind the stern and foam at the bow.
  ctx.fillStyle = 'rgba(200,245,255,0.18)'
  ctx.beginPath()
  ctx.ellipse(stern - 22 * scale, seaY + 2, 40 * scale, 2.5 * scale, 0, 0, Math.PI * 2)
  ctx.fill()

  // Hull.
  const hull = ctx.createLinearGradient(0, deckY, 0, hullBottom)
  hull.addColorStop(0, '#2a3445')
  hull.addColorStop(1, '#0b0f16')
  ctx.fillStyle = hull
  ctx.beginPath()
  ctx.moveTo(stern, deckY)
  ctx.lineTo(bow - L * 0.03, deckY)
  ctx.lineTo(bow, deckY + (seaY - deckY) * 0.3)
  ctx.lineTo(bow - L * 0.07, hullBottom)
  ctx.lineTo(stern + L * 0.03, hullBottom)
  ctx.lineTo(stern, seaY - 3 * scale)
  ctx.closePath()
  ctx.fill()

  // Portholes and hull code.
  ctx.fillStyle = 'rgba(34,225,255,0.55)'
  for (let x = stern + L * 0.08; x < bow - L * 0.3; x += 14 * scale) ctx.fillRect(x, deckY + (seaY - deckY) * 0.42, 1.8 * scale, 1.4 * scale)
  ctx.fillStyle = 'rgba(243,207,110,0.55)'
  ctx.font = `800 ${Math.round(9 * scale)}px "Exo 2 Variable", system-ui, sans-serif`
  ctx.fillText('AX', bow - L * 0.22, deckY + (seaY - deckY) * 0.85)

  // Flight deck.
  ctx.fillStyle = '#323d4f'
  ctx.fillRect(stern, deckY - 3 * scale, L * 0.97, 3 * scale)
  ctx.strokeStyle = 'rgba(34,225,255,0.65)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(stern, deckY - 3 * scale)
  ctx.lineTo(bow - L * 0.03, deckY - 3 * scale)
  ctx.stroke()

  // Deck edge lights.
  for (let x = stern + 6; x < bow - L * 0.04; x += 18 * scale) {
    const on = Math.sin(s.t * 6 - x * 0.05) > 0
    ctx.fillStyle = on ? 'rgba(25,245,163,0.95)' : 'rgba(25,245,163,0.25)'
    ctx.fillRect(x, deckY - 4.5 * scale, 2 * scale, 2 * scale)
  }

  // Touchdown zone with arrestor wires.
  const zx = stern + zoneCenter
  const glow = focused ? 0.35 + 0.65 * s.zoneGlow : 0.25
  ctx.save()
  ctx.shadowColor = '#19f5a3'
  ctx.shadowBlur = 16 * glow
  ctx.fillStyle = `rgba(25,245,163,${0.35 + glow * 0.55})`
  ctx.fillRect(zx - zoneHalf, deckY - 5 * scale, zoneHalf * 2, 2.5 * scale)
  ctx.restore()
  ctx.strokeStyle = `rgba(210,255,240,${0.4 + glow * 0.5})`
  for (let i = 0; i < 4; i++) {
    const x = zx - zoneHalf * 0.75 + (i * zoneHalf * 1.5) / 3
    ctx.beginPath()
    ctx.moveTo(x, deckY - 3 * scale)
    ctx.lineTo(x, deckY - 7 * scale)
    ctx.stroke()
  }

  // Island superstructure.
  const ix = stern + L * 0.64
  const iw = L * 0.1
  const ih = s.h * 0.085 * size
  ctx.fillStyle = '#1c2431'
  ctx.fillRect(ix, deckY - 3 * scale - ih, iw, ih)
  ctx.fillStyle = 'rgba(34,225,255,0.7)'
  ctx.fillRect(ix + iw * 0.1, deckY - 3 * scale - ih * 0.78, iw * 0.8, 2.5 * scale)
  ctx.fillRect(ix + iw * 0.1, deckY - 3 * scale - ih * 0.5, iw * 0.8, 1.5 * scale)
  ctx.strokeStyle = '#4a5669'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(ix + iw * 0.5, deckY - 3 * scale - ih)
  ctx.lineTo(ix + iw * 0.5, deckY - 3 * scale - ih * 1.45)
  ctx.moveTo(ix + iw * 0.5 - 9 * scale * Math.cos(s.t * 3), deckY - 3 * scale - ih * 1.3)
  ctx.lineTo(ix + iw * 0.5 + 9 * scale * Math.cos(s.t * 3), deckY - 3 * scale - ih * 1.3)
  ctx.stroke()
  if (Math.sin(s.t * 4) > 0.2) {
    ctx.fillStyle = '#ff4d6d'
    ctx.beginPath()
    ctx.arc(ix + iw * 0.5, deckY - 3 * scale - ih * 1.47, 2.2 * scale, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.lineWidth = 1
}

function drawPlane(ctx: CanvasRenderingContext2D, s: CarrierScene) {
  const p = s.plane
  if (!p.visible) return
  const k = geometry(s.w, s.h).scale * 1.05
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.angle)
  ctx.scale(k, k)

  // Afterburner.
  if (p.flame > 0.02) {
    const len = 10 + p.flame * 18 + Math.random() * 4
    const fg = ctx.createLinearGradient(-22, 0, -22 - len, 0)
    fg.addColorStop(0, 'rgba(210,255,245,0.95)')
    fg.addColorStop(0.35, 'rgba(25,245,163,0.8)')
    fg.addColorStop(1, 'rgba(34,225,255,0)')
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.moveTo(-21, -2.5)
    ctx.lineTo(-21 - len, 0)
    ctx.lineTo(-21, 2.5)
    ctx.closePath()
    ctx.fill()
  }

  ctx.shadowColor = 'rgba(34,225,255,0.9)'
  ctx.shadowBlur = 10
  // Tail fin.
  ctx.fillStyle = '#1b2433'
  ctx.beginPath()
  ctx.moveTo(-20, -2)
  ctx.lineTo(-25, -13)
  ctx.lineTo(-17, -13)
  ctx.lineTo(-9, -3)
  ctx.closePath()
  ctx.fill()
  // Fuselage.
  const body = ctx.createLinearGradient(0, -6, 0, 6)
  body.addColorStop(0, '#dff6ff')
  body.addColorStop(0.45, '#7e8ea6')
  body.addColorStop(1, '#2c3647')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(26, 0.5)
  ctx.quadraticCurveTo(16, -5.5, -4, -5)
  ctx.lineTo(-22, -3)
  ctx.lineTo(-22, 3.5)
  ctx.lineTo(-2, 4.5)
  ctx.quadraticCurveTo(16, 4.5, 26, 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  // Delta wing.
  ctx.fillStyle = '#22c7e6'
  ctx.beginPath()
  ctx.moveTo(6, 1.5)
  ctx.lineTo(-14, 9)
  ctx.lineTo(-17, 9)
  ctx.lineTo(-10, 1.5)
  ctx.closePath()
  ctx.fill()
  // Canopy.
  ctx.fillStyle = '#19f5a3'
  ctx.beginPath()
  ctx.ellipse(11, -3.6, 5.5, 2.2, -0.12, 0, Math.PI * 2)
  ctx.fill()
  // Neon stripe.
  ctx.strokeStyle = 'rgba(25,245,163,0.9)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-18, 0.5)
  ctx.lineTo(20, 0.5)
  ctx.stroke()
  // Tailhook.
  if (p.hook) {
    ctx.strokeStyle = '#f3cf6e'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-15, 3.5)
    ctx.lineTo(-22, 9)
    ctx.stroke()
  }
  ctx.restore()
}

export function tokenColors(b: BonusType): [string, string] {
  if (b.kind === 'rocket') return ['#ff8da1', '#ff4d6d']
  if (b.kind === 'mul') return b.value >= 5 ? ['#fff6d8', '#f3c34a'] : b.value >= 3 ? ['#ffe6f6', '#f472d0'] : ['#efe9ff', '#9d7bff']
  if (b.value >= 5) return ['#fff6d8', '#f3c34a']
  if (b.value >= 1) return ['#e3fcff', '#22e1ff']
  return ['#d9fff1', '#19f5a3']
}

function drawToken(ctx: CanvasRenderingContext2D, s: CarrierScene, tok: Token, label: string) {
  const k = geometry(s.w, s.h).scale
  const [light, base] = tokenColors(tok.bonus)
  const pulse = 1 + Math.sin(s.t * 6 + tok.x * 0.03) * 0.06
  if (tok.bonus.kind === 'rocket') {
    // Incoming rocket, nose pointing at the jet.
    ctx.save()
    ctx.translate(tok.x, tok.y)
    ctx.scale(k, k)
    const flame = ctx.createLinearGradient(10, 0, 26, 0)
    flame.addColorStop(0, 'rgba(255,207,90,0.95)')
    flame.addColorStop(1, 'rgba(255,77,109,0)')
    ctx.fillStyle = flame
    ctx.beginPath()
    ctx.moveTo(10, -3)
    ctx.lineTo(24 + Math.random() * 6, 0)
    ctx.lineTo(10, 3)
    ctx.fill()
    ctx.shadowColor = base
    ctx.shadowBlur = 12
    ctx.fillStyle = '#dfe6ee'
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.lineTo(-7, -3.5)
    ctx.lineTo(10, -3.5)
    ctx.lineTo(10, 3.5)
    ctx.lineTo(-7, 3.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = base
    ctx.fillRect(4, -6, 5, 12)
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.lineTo(-8, -3.5)
    ctx.lineTo(-8, 3.5)
    ctx.fill()
    ctx.restore()
    return
  }
  const r = 15 * k * pulse
  ctx.save()
  ctx.shadowColor = base
  ctx.shadowBlur = 18 * k
  const g = ctx.createRadialGradient(tok.x - r * 0.35, tok.y - r * 0.35, r * 0.1, tok.x, tok.y, r)
  g.addColorStop(0, light)
  g.addColorStop(0.55, base)
  g.addColorStop(1, 'rgba(7,9,13,0.9)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(tok.x, tok.y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = light
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(tok.x, tok.y, r + 3 * k, s.t * 3, s.t * 3 + Math.PI * 1.3)
  ctx.stroke()
  ctx.fillStyle = '#07090d'
  ctx.font = `800 ${Math.round((label.length > 3 ? 10 : 12) * k)}px "JetBrains Mono Variable", ui-monospace, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, tok.x, tok.y + 0.5)
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
}

function drawPopups(ctx: CanvasRenderingContext2D, s: CarrierScene, dt: number) {
  const k = geometry(s.w, s.h).scale
  s.popups = s.popups.filter((p) => (p.life -= dt) > 0)
  ctx.textAlign = 'center'
  ctx.font = `800 ${Math.round(18 * k)}px "JetBrains Mono Variable", ui-monospace, monospace`
  for (const p of s.popups) {
    p.y -= 34 * k * dt
    ctx.globalAlpha = Math.min(1, p.life / 0.4)
    ctx.shadowColor = p.color
    ctx.shadowBlur = 12
    ctx.fillStyle = p.color
    ctx.fillText(p.text, p.x, p.y)
  }
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  ctx.textAlign = 'start'
}

function drawParticles(ctx: CanvasRenderingContext2D, s: CarrierScene, dt: number) {
  const next: Particle[] = []
  for (const p of s.particles) {
    p.life -= dt
    if (p.life <= 0) continue
    p.vy += (p.gravity ?? 0) * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    const a = p.life / p.max
    ctx.globalAlpha = a
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2)
    ctx.fill()
    next.push(p)
  }
  ctx.globalAlpha = 1
  s.particles = next
}

/** Advances the parallax and draws one frame. `dt` is in seconds. */
export function drawScene(ctx: CanvasRenderingContext2D, s: CarrierScene, dt: number, tokens: readonly Token[] = [], label: (b: BonusType) => string = () => '') {
  const { seaY } = geometry(s.w, s.h)
  s.t += dt
  s.scroll += s.speed * dt
  for (const c of s.clouds) {
    c.x -= s.speed * c.depth * dt
    if (c.x < -c.w) {
      c.x = s.w + c.w * 0.5 + Math.random() * 80
      c.y = s.h * (0.08 + Math.random() * 0.45)
    }
  }
  ctx.clearRect(0, 0, s.w, s.h)
  drawSky(ctx, s, seaY)
  drawSea(ctx, s, seaY)
  s.fleet.forEach((ship, i) => drawCarrier(ctx, s, ship.x, ship.len, i === s.focus))
  for (const tok of tokens) if (tok.x > -40 && tok.x < s.w + 40) drawToken(ctx, s, tok, label(tok.bonus))
  drawParticles(ctx, s, dt)
  drawPlane(ctx, s)
  drawPopups(ctx, s, dt)
}

/** Contrail puffs behind the jet. */
export function puff(s: CarrierScene) {
  const p = s.plane
  const k = geometry(s.w, s.h).scale
  const tailX = p.x - Math.cos(p.angle) * 24 * k
  const tailY = p.y - Math.sin(p.angle) * 24 * k
  s.particles.push({ x: tailX, y: tailY, vx: -s.speed * 0.9 - 20, vy: (Math.random() - 0.5) * 8, life: 0.7, max: 0.7, size: 2.2 * k, color: 'rgba(170,240,255,0.5)' })
}

export function burst(s: CarrierScene, x: number, y: number, color: string, count = 18, power = 120) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const v = power * (0.3 + Math.random() * 0.7)
    s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.4, max: 1, size: 1.5 + Math.random() * 2, color })
  }
}

export function splash(s: CarrierScene, x: number) {
  const { seaY, scale } = geometry(s.w, s.h)
  for (let i = 0; i < 34; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4
    const v = (90 + Math.random() * 170) * scale
    s.particles.push({ x: x + (Math.random() - 0.5) * 14, y: seaY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1, max: 1.1, size: 1.6 + Math.random() * 2.2, color: i % 3 ? 'rgba(190,245,255,0.9)' : 'rgba(34,225,255,0.9)', gravity: 380 * scale })
  }
}
