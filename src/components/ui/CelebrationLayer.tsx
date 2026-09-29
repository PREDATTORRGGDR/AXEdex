import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { useFx } from '../../store/fx'
import { effectsLowNow } from '../../store/perf'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vr: number
  color: string
  shape: 'coin' | 'rect'
  life: number
}

const CONFETTI = ['#fcd96b', '#34f5a0', '#22d3ee', '#f472d0', '#a78bfa', '#ffffff']

/** Full-screen canvas that bursts coins / confetti whenever `celebrate()` fires. */
export function CelebrationLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const celebration = useFx((s) => s.celebration)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!celebration || reduced) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const count = Math.round((40 + celebration.intensity * 50) * (effectsLowNow() ? 0.4 : 1))
    const particles: Particle[] = Array.from({ length: count }, () => {
      const fromLeft = Math.random() < 0.5
      const coin = celebration.kind === 'coins' ? Math.random() < 0.75 : Math.random() < 0.15
      return {
        x: fromLeft ? w * 0.1 + Math.random() * w * 0.15 : w * 0.75 + Math.random() * w * 0.15,
        y: h + 10,
        vx: (fromLeft ? 1 : -1) * (2 + Math.random() * 5),
        vy: -(12 + Math.random() * 9) * Math.min(1.25, h / 800 + 0.35),
        size: coin ? 10 + Math.random() * 8 : 6 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.4,
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
        shape: coin ? 'coin' : 'rect',
        life: 0,
      }
    })

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.67)
      last = now
      ctx.clearRect(0, 0, w, h)
      let alive = 0
      for (const p of particles) {
        p.life += dt
        p.vy += 0.32 * dt
        p.vx *= 0.995
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        if (p.y > h + 40) continue
        alive++
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        if (p.shape === 'coin') {
          const squash = Math.abs(Math.cos(p.rot * 2))
          ctx.scale(Math.max(0.2, squash), 1)
          const g = ctx.createRadialGradient(-p.size * 0.3, -p.size * 0.3, 1, 0, 0, p.size)
          g.addColorStop(0, '#fff4d1')
          g.addColorStop(0.45, '#fcd96b')
          g.addColorStop(1, '#b98511')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = 'rgba(138,98,13,0.8)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(0, 0, p.size * 0.65, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }
        ctx.restore()
      }
      if (alive > 0) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, w, h)
    }
  }, [celebration, reduced])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[70] size-full" aria-hidden />
}
