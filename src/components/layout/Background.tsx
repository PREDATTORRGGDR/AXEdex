import { useEffect, useRef } from 'react'
import { useEffectsLow } from '../../store/perf'

type Hue = 'gold' | 'emerald' | 'white'

interface Mote {
  x: number
  y: number
  r: number
  speed: number
  drift: number
  phase: number
  hue: Hue
}

const COLORS: Record<Hue, string> = {
  gold: '252,217,107',
  emerald: '52,245,160',
  white: '220,230,255',
}

/** Pre-renders one soft glow per colour; drawing a sprite is far cheaper than a gradient per frame. */
function makeSprite(rgb: string): HTMLCanvasElement {
  const size = 32
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, `rgba(${rgb},0.9)`)
  g.addColorStop(0.25, `rgba(${rgb},0.45)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return c
}

const FRAME_MS = 1000 / 30

/** Floating luminous particles at 30 fps on a 1× canvas (a static frame in economy mode). */
function ParticleField({ low }: { low: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const sprites = { gold: makeSprite(COLORS.gold), emerald: makeSprite(COLORS.emerald), white: makeSprite(COLORS.white) }

    let w = 0
    let h = 0
    let motes: Mote[] = []
    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8,
      speed: 0.15 + Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 0.4,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.55 ? 'gold' : Math.random() < 0.6 ? 'emerald' : 'white',
    })

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0015 + m.phase))
        const d = m.r * 12
        ctx.drawImage(sprites[m.hue], m.x - d / 2, m.y - d / 2, d, d)
      }
      ctx.globalAlpha = 1
    }

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
      const count = Math.round(Math.min(low ? 30 : 55, (w * h) / 26000))
      motes = Array.from({ length: count }, () => spawn(true))
      draw(0)
    }
    resize()
    window.addEventListener('resize', resize)
    if (low) return () => window.removeEventListener('resize', resize)

    let raf = 0
    let last = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < FRAME_MS) return
      last = t
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i]
        m.y -= m.speed
        m.x += m.drift + Math.sin(t * 0.0004 + m.phase) * 0.3
        if (m.y < -20 || m.x < -20 || m.x > w + 20) motes[i] = spawn(false)
      }
      draw(t)
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
  }, [low])

  return <canvas ref={ref} className="absolute inset-0 size-full" aria-hidden />
}

/**
 * Fixed, layered backdrop: gradient mesh, drifting aurora orbs, grid and particles.
 * Orbs are radial gradients (no blur filter) and the whole layer is isolated with
 * CSS containment so it never forces the page above it to repaint.
 */
export function Background() {
  const low = useEffectsLow()
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950 [contain:strict]" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-10%,#13204a_0%,transparent_70%)]" />
      <div className="fx-float absolute -top-64 -left-64 size-[56rem] animate-float-slow rounded-full bg-[radial-gradient(closest-side,rgba(226,171,28,0.13),transparent)] will-change-transform" />
      <div
        className="fx-float absolute top-[15%] -right-72 size-[54rem] animate-float-slow rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.13),transparent)] will-change-transform"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="fx-float absolute -bottom-80 left-[15%] size-[52rem] animate-float-slow rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.14),transparent)] will-change-transform"
        style={{ animationDelay: '-11s' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_50%_0%,black_20%,transparent_75%)]" />
      <ParticleField low={low} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  )
}
