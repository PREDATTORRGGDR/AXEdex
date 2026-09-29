import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

interface Mote {
  x: number
  y: number
  r: number
  speed: number
  drift: number
  phase: number
  hue: 'gold' | 'emerald' | 'white'
}

const COLORS = {
  gold: [252, 217, 107],
  emerald: [52, 245, 160],
  white: [220, 230, 255],
} as const

/** Floating luminous particles drawn on a low-cost canvas. */
function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let w = 0
    let h = 0
    let motes: Mote[] = []
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8,
      speed: 0.08 + Math.random() * 0.35,
      drift: (Math.random() - 0.5) * 0.25,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.55 ? 'gold' : Math.random() < 0.6 ? 'emerald' : 'white',
    })

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(70, (w * h) / 22000))
      motes = Array.from({ length: count }, () => spawn(true))
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0015 + m.phase))
        const [r, g, b] = COLORS[m.hue]
        const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 6)
        glow.addColorStop(0, `rgba(${r},${g},${b},${0.55 * twinkle})`)
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r * 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (reduced) {
      draw(0)
      return () => window.removeEventListener('resize', resize)
    }

    let raf = 0
    const loop = (t: number) => {
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i]
        m.y -= m.speed
        m.x += m.drift + Math.sin(t * 0.0004 + m.phase) * 0.15
        if (m.y < -20 || m.x < -20 || m.x > w + 20) motes[i] = spawn(false)
      }
      draw(t)
      raf = requestAnimationFrame(loop)
    }
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced])

  return <canvas ref={ref} className="absolute inset-0 size-full" aria-hidden />
}

/** Fixed, layered backdrop: gradient mesh, drifting aurora orbs, grid and particles. */
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-10%,#13204a_0%,transparent_70%)]" />
      <div className="absolute -top-40 -left-40 size-[42rem] animate-float-slow rounded-full bg-gold-500/[0.09] blur-[120px]" />
      <div
        className="absolute top-1/3 -right-48 size-[40rem] animate-float-slow rounded-full bg-emerald-500/[0.1] blur-[120px]"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="absolute -bottom-56 left-1/4 size-[38rem] animate-float-slow rounded-full bg-violet-600/[0.1] blur-[130px]"
        style={{ animationDelay: '-11s' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_50%_0%,black_20%,transparent_75%)]" />
      <ParticleField />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  )
}
