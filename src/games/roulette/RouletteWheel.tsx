import { useEffect, useRef } from 'react'
import { sfx } from '../../audio/sfx'
import { useElementSize } from '../../hooks/useElementSize'
import { useInViewRef } from '../../hooks/useInViewRef'
import { easeOutCubic } from '../../lib/async'
import { colorOf, POCKETS, WHEEL_ORDER } from './logic'

export interface WheelSpin {
  id: number
  number: number
}

interface RouletteWheelProps {
  spin: WheelSpin | null
  onSettled: (spin: WheelSpin) => void
  /** Highlight the pocket that just won. */
  highlight?: number | null
}

const SEG = (Math.PI * 2) / POCKETS
const IDLE_SPEED = 0.22 // rad/s, wheel drift while idle
const SPIN_MS = 7200

const POCKET_FILL = { red: '#c81d36', black: '#141824', green: '#0f9d63' }

/** Index of a number on the wheel. */
const indexOf = (n: number) => WHEEL_ORDER.indexOf(n as (typeof WHEEL_ORDER)[number])

/** Pre-renders the rotating part of the wheel (pockets, numbers, cone). */
function renderRotor(size: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = Math.round(size * dpr)
  const ctx = c.getContext('2d')!
  ctx.scale(dpr, dpr)
  const R = size / 2
  ctx.translate(R, R)

  // Pocket ring with numbers.
  for (let i = 0; i < POCKETS; i++) {
    const n = WHEEL_ORDER[i]
    const a0 = i * SEG - SEG / 2 - Math.PI / 2
    const a1 = a0 + SEG
    ctx.beginPath()
    ctx.arc(0, 0, R * 0.8, a0, a1)
    ctx.arc(0, 0, R * 0.6, a1, a0, true)
    ctx.closePath()
    const grad = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 0.8)
    const base = POCKET_FILL[colorOf(n)]
    grad.addColorStop(0, base)
    grad.addColorStop(1, shade(base, 0.25))
    ctx.fillStyle = grad
    ctx.fill()

    // Inner pocket (where the ball rests).
    ctx.beginPath()
    ctx.arc(0, 0, R * 0.6, a0, a1)
    ctx.arc(0, 0, R * 0.47, a1, a0, true)
    ctx.closePath()
    ctx.fillStyle = shade(base, -0.45)
    ctx.fill()

    // Number
    ctx.save()
    ctx.rotate(i * SEG)
    ctx.fillStyle = '#fdf6e3'
    ctx.font = `800 ${Math.max(9, R * 0.085)}px 'Exo 2 Variable', system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(n), 0, -R * 0.705)
    ctx.restore()
  }

  // Gold frets between pockets.
  ctx.strokeStyle = 'rgba(252, 217, 107, 0.85)'
  ctx.lineWidth = Math.max(1, R * 0.008)
  for (let i = 0; i < POCKETS; i++) {
    const a = i * SEG - SEG / 2 - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * R * 0.47, Math.sin(a) * R * 0.47)
    ctx.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8)
    ctx.stroke()
  }
  for (const r of [0.8, 0.6, 0.47]) {
    ctx.beginPath()
    ctx.arc(0, 0, R * r, 0, Math.PI * 2)
    ctx.lineWidth = r === 0.6 ? Math.max(1.5, R * 0.012) : Math.max(1, R * 0.01)
    ctx.stroke()
  }

  // Cone
  const cone = ctx.createRadialGradient(-R * 0.1, -R * 0.12, R * 0.02, 0, 0, R * 0.47)
  cone.addColorStop(0, '#3b2a12')
  cone.addColorStop(0.55, '#1c1409')
  cone.addColorStop(1, '#0b0804')
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.465, 0, Math.PI * 2)
  ctx.fillStyle = cone
  ctx.fill()
  for (let i = 0; i < 8; i++) {
    ctx.save()
    ctx.rotate((i * Math.PI) / 4)
    ctx.fillStyle = i % 2 ? 'rgba(243,207,110,0.08)' : 'rgba(25,245,163,0.06)'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, R * 0.46, -0.2, 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Turret: four gold arms with knobs.
  const gold = ctx.createLinearGradient(-R * 0.2, -R * 0.2, R * 0.2, R * 0.2)
  gold.addColorStop(0, '#fff4d1')
  gold.addColorStop(0.5, '#f3cf6e')
  gold.addColorStop(1, '#8a620d')
  ctx.strokeStyle = gold
  ctx.lineCap = 'round'
  ctx.lineWidth = R * 0.035
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * R * 0.28, Math.sin(a) * R * 0.28)
    ctx.stroke()
    ctx.beginPath()
    ctx.fillStyle = gold
    ctx.arc(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3, R * 0.035, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.09, 0, Math.PI * 2)
  ctx.fillStyle = gold
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.04, 0, Math.PI * 2)
  ctx.fillStyle = '#10b981'
  ctx.fill()
  return c
}

/** Pre-renders the static outer bowl (rim + ball track). */
function renderBowl(size: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = Math.round(size * dpr)
  const ctx = c.getContext('2d')!
  ctx.scale(dpr, dpr)
  const R = size / 2
  ctx.translate(R, R)

  const rim = ctx.createLinearGradient(-R, -R, R, R)
  rim.addColorStop(0, '#fff4d1')
  rim.addColorStop(0.35, '#e2ab1c')
  rim.addColorStop(0.65, '#6b4a0a')
  rim.addColorStop(1, '#f3cf6e')
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.995, 0, Math.PI * 2)
  ctx.fillStyle = rim
  ctx.fill()

  const wood = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 0.97)
  wood.addColorStop(0, '#0b1022')
  wood.addColorStop(0.6, '#121a36')
  wood.addColorStop(1, '#060914')
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.965, 0, Math.PI * 2)
  ctx.fillStyle = wood
  ctx.fill()

  // Ball track sheen
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = R * 0.07
  ctx.stroke()

  // Diamond deflectors
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8
    ctx.save()
    ctx.rotate(a)
    ctx.translate(0, -R * 0.84)
    ctx.beginPath()
    ctx.moveTo(0, -R * 0.03)
    ctx.lineTo(R * 0.018, 0)
    ctx.lineTo(0, R * 0.03)
    ctx.lineTo(-R * 0.018, 0)
    ctx.closePath()
    ctx.fillStyle = '#f3cf6e'
    ctx.fill()
    ctx.restore()
  }
  return c
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)))
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`
}

/**
 * Canvas roulette wheel. The wheel drifts clockwise, the ball is launched
 * counter-clockwise on the track, spirals down, bounces across a few frets and
 * comes to rest in the pocket chosen by the RNG.
 */
export function RouletteWheel({ spin, onSettled, highlight }: RouletteWheelProps) {
  const [wrapRef, { width }] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inView = useInViewRef(canvasRef)

  // Animation state lives in refs so the render loop never re-renders React.
  const wheel = useRef(0)
  const ballRel = useRef(0) // ball angle relative to the wheel
  const ballRadius = useRef(0.545)
  const active = useRef<{ spin: WheelSpin; start: number; fromRel: number; toRel: number; fromWheel: number } | null>(null)
  const highlightRef = useRef<number | null>(null)
  const settledRef = useRef(onSettled)
  const lastTickPocket = useRef(0)

  useEffect(() => {
    settledRef.current = onSettled
  }, [onSettled])

  useEffect(() => {
    highlightRef.current = highlight ?? null
  }, [highlight])

  // Launch a new spin.
  useEffect(() => {
    if (!spin) return
    const target = indexOf(spin.number) * SEG
    const from = ballRel.current
    const turns = 9 + Math.floor(Math.random() * 2)
    const delta = ((((from - target) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) + turns * Math.PI * 2
    active.current = { spin, start: performance.now(), fromRel: target + delta, toRel: target, fromWheel: wheel.current }
    ballRel.current = target + delta
    sfx.play('whoosh')
  }, [spin])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const size = Math.min(width, 520)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    const ctx = canvas.getContext('2d')!
    const rotor = renderRotor(size, dpr)
    const bowl = renderBowl(size, dpr)
    const R = size / 2

    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const a = active.current
      // Idle drift is gentle: 30 fps is plenty, and nothing is drawn while off screen.
      if (!a && (!inView.current || now - last < 33)) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (a) {
        const p = Math.min(1, (now - a.start) / SPIN_MS)
        // Wheel: idle drift plus an extra push that bleeds off.
        wheel.current = a.fromWheel + IDLE_SPEED * ((now - a.start) / 1000) + Math.PI * 2 * 1.1 * easeOutCubic(p)
        // Ball, relative to the wheel, decelerates to its pocket.
        ballRel.current = a.toRel + (a.fromRel - a.toRel) * (1 - easeOutCubic(p))
        // Radius: on the track, drop, bounce, rest.
        if (p < 0.04) ballRadius.current = 0.545 + (0.9 - 0.545) * (p / 0.04)
        else if (p < 0.58) ballRadius.current = 0.9
        else if (p < 0.7) {
          const q = (p - 0.58) / 0.12
          ballRadius.current = 0.9 - (0.9 - 0.62) * q * q
        } else if (p < 0.9) {
          const q = (p - 0.7) / 0.2
          ballRadius.current = 0.545 + 0.07 * Math.abs(Math.sin(q * Math.PI * 3)) * (1 - q)
        } else ballRadius.current = 0.545

        // Fret clicks once the ball is among the pockets.
        if (p > 0.6) {
          const pocket = Math.floor(ballRel.current / SEG)
          if (pocket !== lastTickPocket.current) {
            lastTickPocket.current = pocket
            if (p < 0.97) sfx.play('tick', { pitch: 0.8 + Math.random() * 0.4 })
          }
        }

        if (p >= 1) {
          active.current = null
          ballRel.current = a.toRel
          settledRef.current(a.spin)
        }
      } else {
        wheel.current += IDLE_SPEED * dt
      }

      // ---- draw ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(bowl, 0, 0, size, size)

      ctx.save()
      ctx.translate(R, R)
      ctx.rotate(wheel.current)
      ctx.drawImage(rotor, -R, -R, size, size)

      const hl = highlightRef.current
      if (hl !== null && !a) {
        const i = indexOf(hl)
        const a0 = i * SEG - SEG / 2 - Math.PI / 2
        const pulse = 0.55 + 0.45 * Math.sin(now / 180)
        ctx.beginPath()
        ctx.arc(0, 0, R * 0.8, a0, a0 + SEG)
        ctx.arc(0, 0, R * 0.47, a0 + SEG, a0, true)
        ctx.closePath()
        ctx.fillStyle = `rgba(252, 217, 107, ${0.18 + 0.2 * pulse})`
        ctx.shadowColor = '#f3cf6e'
        ctx.shadowBlur = 18
        ctx.fill()
        ctx.shadowBlur = 0
      }
      ctx.restore()

      // Ball (absolute angle = wheel + relative).
      const ang = wheel.current + ballRel.current - Math.PI / 2
      const bx = R + Math.cos(ang) * R * ballRadius.current
      const by = R + Math.sin(ang) * R * ballRadius.current
      const br = Math.max(4, R * 0.036)
      ctx.beginPath()
      ctx.arc(bx + br * 0.25, by + br * 0.35, br, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fill()
      const ball = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.35, br * 0.1, bx, by, br)
      ball.addColorStop(0, '#ffffff')
      ball.addColorStop(0.6, '#e5e7eb')
      ball.addColorStop(1, '#9ca3af')
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, Math.PI * 2)
      ctx.fillStyle = ball
      ctx.fill()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [width, inView])

  return (
    <div ref={wrapRef} className="relative grid w-full place-items-center">
      <div className="absolute inset-[8%] rounded-full bg-gold-400/10 blur-3xl" aria-hidden />
      <canvas ref={canvasRef} className="relative drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]" role="img" aria-label="Колесо рулетки" />
    </div>
  )
}
