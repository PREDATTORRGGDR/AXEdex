import { useEffect, useRef } from 'react'
import { useInViewRef } from '../../hooks/useInViewRef'
import { useEffectsLow } from '../../store/perf'
import { cn } from '../../lib/cn'

type Hue = 'gold' | 'emerald' | 'cyan'

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
  gold: '255,207,90',
  emerald: '25,245,163',
  cyan: '34,225,255',
}

/** Pre-renders one soft glow per colour; drawing a sprite is far cheaper than a gradient per frame. */
function makeSprite(rgb: string): HTMLCanvasElement {
  const size = 32
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, `rgba(${rgb},0.95)`)
  g.addColorStop(0.25, `rgba(${rgb},0.4)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return c
}

const FRAME_MS = 1000 / 30

/**
 * Luminous motes rising through their parent box at 30 fps on a 1× canvas.
 * Pauses while scrolled away or the tab is hidden; a static frame in economy mode.
 */
export function ParticleField({ density = 1, className }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const inView = useInViewRef(ref)
  const low = useEffectsLow()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const sprites = { gold: makeSprite(COLORS.gold), emerald: makeSprite(COLORS.emerald), cyan: makeSprite(COLORS.cyan) }

    let w = 0
    let h = 0
    let motes: Mote[] = []
    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.5 + Math.random() * 1.6,
      speed: 0.12 + Math.random() * 0.45,
      drift: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.5 ? 'emerald' : Math.random() < 0.6 ? 'gold' : 'cyan',
    })

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.0015 + m.phase))
        const d = m.r * 12
        ctx.drawImage(sprites[m.hue], m.x - d / 2, m.y - d / 2, d, d)
      }
      ctx.globalAlpha = 1
    }

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w
      canvas.height = h
      const count = Math.round(Math.min((low ? 18 : 40) * density, ((w * h) / 9000) * density))
      motes = Array.from({ length: count }, () => spawn(true))
      draw(0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    if (low) return () => ro.disconnect()

    let raf = 0
    let last = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < FRAME_MS || !inView.current) return
      last = t
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i]
        m.y -= m.speed
        m.x += m.drift + Math.sin(t * 0.0004 + m.phase) * 0.25
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
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [low, density, inView])

  return <canvas ref={ref} className={cn('pointer-events-none absolute inset-0 size-full', className)} aria-hidden />
}

/**
 * Fixed, fully static backdrop: graphite base, neon haze at the top, a fine
 * terminal grid and a vignette. Nothing here animates, so the frosted panels
 * above it only re-blur when the page scrolls.
 */
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-900 [contain:strict]" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(70%_45%_at_18%_-8%,rgba(25,245,163,0.10),transparent_70%),radial-gradient(60%_40%_at_88%_-6%,rgba(34,225,255,0.08),transparent_70%),radial-gradient(80%_50%_at_50%_115%,rgba(212,165,67,0.07),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_10%,transparent_80%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-emerald/40 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  )
}
