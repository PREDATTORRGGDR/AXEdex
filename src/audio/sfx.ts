import { useCasino } from '../store/casino'

/**
 * Tiny synthesizer built on the Web Audio API. Every sound is generated on the
 * fly from oscillators and filtered noise, so the app ships zero audio assets.
 */
export type SoundName =
  | 'click'
  | 'chip'
  | 'deal'
  | 'flip'
  | 'tick'
  | 'whoosh'
  | 'reelStop'
  | 'win'
  | 'bigWin'
  | 'lose'
  | 'push'
  | 'coin'
  | 'cashout'
  | 'explosion'
  | 'gem'
  | 'peg'
  | 'dice'
  | 'ping'
  | 'achievement'
  | 'levelUp'
  | 'bonus'
  | 'error'
  | 'launch'

interface ToneOptions {
  freq: number
  type?: OscillatorType
  duration: number
  delay?: number
  gain?: number
  attack?: number
  slideTo?: number
  detune?: number
}

interface NoiseOptions {
  duration: number
  delay?: number
  gain?: number
  filter?: BiquadFilterType
  freq?: number
  freqTo?: number
  q?: number
}

const NOTE = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12)
// Handy pitches
const C5 = NOTE(3)
const E5 = NOTE(7)
const G5 = NOTE(10)
const C6 = NOTE(15)
const E6 = NOTE(19)
const G6 = NOTE(22)

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private enabled = true
  private volume = 0.7
  private lastPlayed = new Map<SoundName, number>()

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  setVolume(volume: number) {
    this.volume = volume
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(volume * 0.5, this.ctx.currentTime, 0.02)
  }

  /** Lazily creates the AudioContext; browsers require a user gesture first. */
  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume * 0.5
      const compressor = this.ctx.createDynamicsCompressor()
      compressor.threshold.value = -12
      compressor.ratio.value = 6
      this.master.connect(compressor).connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = ctx.sampleRate
      this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate)
      const data = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    }
    return this.noiseBuffer
  }

  private tone(ctx: AudioContext, o: ToneOptions) {
    const t0 = ctx.currentTime + (o.delay ?? 0)
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = o.type ?? 'sine'
    osc.frequency.setValueAtTime(o.freq, t0)
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t0 + o.duration)
    if (o.detune) osc.detune.value = o.detune
    const peak = o.gain ?? 0.3
    const attack = o.attack ?? 0.005
    env.gain.setValueAtTime(0.0001, t0)
    env.gain.exponentialRampToValueAtTime(peak, t0 + attack)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration)
    osc.connect(env).connect(this.master!)
    osc.start(t0)
    osc.stop(t0 + o.duration + 0.02)
  }

  private noise(ctx: AudioContext, o: NoiseOptions) {
    const t0 = ctx.currentTime + (o.delay ?? 0)
    const src = ctx.createBufferSource()
    src.buffer = this.getNoise(ctx)
    const filter = ctx.createBiquadFilter()
    filter.type = o.filter ?? 'bandpass'
    filter.frequency.setValueAtTime(o.freq ?? 2000, t0)
    if (o.freqTo) filter.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + o.duration)
    filter.Q.value = o.q ?? 1
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t0)
    env.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t0 + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration)
    src.connect(filter).connect(env).connect(this.master!)
    src.start(t0, Math.random() * 0.5)
    src.stop(t0 + o.duration + 0.02)
  }

  /**
   * Plays a named sound. `pitch` scales frequencies (1 = default), handy for
   * rising sequences such as consecutive Mines reveals or Plinko pegs.
   */
  play(name: SoundName, opts: { pitch?: number } = {}) {
    if (!this.enabled || this.volume <= 0) return
    // Throttle machine-gun repeats of the same sound.
    const now = performance.now()
    const minGap = name === 'tick' || name === 'peg' ? 22 : 12
    if (now - (this.lastPlayed.get(name) ?? 0) < minGap) return
    this.lastPlayed.set(name, now)

    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const p = opts.pitch ?? 1

    switch (name) {
      case 'click':
        this.tone(ctx, { freq: 1200 * p, type: 'sine', duration: 0.05, gain: 0.12 })
        this.noise(ctx, { duration: 0.02, freq: 4000, gain: 0.05 })
        break
      case 'chip':
        this.noise(ctx, { duration: 0.035, freq: 3200 * p, q: 6, gain: 0.35 })
        this.tone(ctx, { freq: 2100 * p, type: 'triangle', duration: 0.06, gain: 0.12 })
        this.noise(ctx, { duration: 0.03, freq: 2600 * p, q: 8, gain: 0.25, delay: 0.045 })
        break
      case 'deal':
        this.noise(ctx, { duration: 0.14, filter: 'highpass', freq: 1200, freqTo: 5000, gain: 0.22 })
        break
      case 'flip':
        this.noise(ctx, { duration: 0.08, freq: 2400, q: 2, gain: 0.2 })
        this.tone(ctx, { freq: 660 * p, type: 'triangle', duration: 0.08, gain: 0.08, delay: 0.03 })
        break
      case 'tick':
        this.tone(ctx, { freq: 2400 * p, type: 'square', duration: 0.018, gain: 0.05 })
        break
      case 'whoosh':
        this.noise(ctx, { duration: 0.5, filter: 'bandpass', freq: 300, freqTo: 3000, q: 0.8, gain: 0.25 })
        break
      case 'launch':
        this.noise(ctx, { duration: 0.9, filter: 'lowpass', freq: 200, freqTo: 2400, gain: 0.3 })
        this.tone(ctx, { freq: 90, slideTo: 260, type: 'sawtooth', duration: 0.8, gain: 0.08 })
        break
      case 'reelStop':
        this.tone(ctx, { freq: 150 * p, slideTo: 70, type: 'sine', duration: 0.12, gain: 0.35 })
        this.noise(ctx, { duration: 0.03, freq: 1800, gain: 0.12 })
        break
      case 'win':
        ;[C5, E5, G5, C6].forEach((f, i) =>
          this.tone(ctx, { freq: f * p, type: 'triangle', duration: 0.22, delay: i * 0.075, gain: 0.22 }),
        )
        break
      case 'bigWin': {
        const run = [C5, E5, G5, C6, E6, G6]
        run.forEach((f, i) => this.tone(ctx, { freq: f, type: 'triangle', duration: 0.25, delay: i * 0.07, gain: 0.2 }))
        ;[C6, E6, G6].forEach((f) =>
          this.tone(ctx, { freq: f, type: 'sawtooth', duration: 1.1, delay: 0.45, gain: 0.05, attack: 0.03 }),
        )
        ;[C5, G5].forEach((f) => this.tone(ctx, { freq: f, type: 'sine', duration: 1.2, delay: 0.45, gain: 0.18 }))
        for (let i = 0; i < 8; i++) {
          this.tone(ctx, { freq: 2600 + Math.random() * 1800, type: 'sine', duration: 0.12, delay: 0.5 + i * 0.08, gain: 0.05 })
        }
        break
      }
      case 'lose':
        this.tone(ctx, { freq: 330, slideTo: 220, type: 'triangle', duration: 0.28, gain: 0.16 })
        this.tone(ctx, { freq: 247, slideTo: 150, type: 'triangle', duration: 0.4, gain: 0.14, delay: 0.16 })
        break
      case 'push':
        this.tone(ctx, { freq: 523, type: 'sine', duration: 0.14, gain: 0.14 })
        this.tone(ctx, { freq: 523, type: 'sine', duration: 0.18, gain: 0.12, delay: 0.14 })
        break
      case 'coin':
        this.tone(ctx, { freq: 988 * p, type: 'square', duration: 0.07, gain: 0.06 })
        this.tone(ctx, { freq: 1319 * p, type: 'square', duration: 0.25, gain: 0.06, delay: 0.07 })
        break
      case 'cashout':
        for (let i = 0; i < 6; i++) {
          this.tone(ctx, { freq: 1319 + i * 120, type: 'triangle', duration: 0.12, delay: i * 0.05, gain: 0.12 })
        }
        this.noise(ctx, { duration: 0.35, filter: 'highpass', freq: 6000, gain: 0.06, delay: 0.05 })
        break
      case 'explosion':
        this.noise(ctx, { duration: 0.9, filter: 'lowpass', freq: 3000, freqTo: 80, gain: 0.55 })
        this.tone(ctx, { freq: 120, slideTo: 30, type: 'sine', duration: 0.6, gain: 0.5 })
        break
      case 'gem':
        this.tone(ctx, { freq: 1046 * p, type: 'sine', duration: 0.25, gain: 0.16 })
        this.tone(ctx, { freq: 1568 * p, type: 'sine', duration: 0.3, gain: 0.09, delay: 0.05 })
        break
      case 'peg':
        this.tone(ctx, { freq: 1400 * p, type: 'triangle', duration: 0.05, gain: 0.07 })
        break
      case 'dice':
        for (let i = 0; i < 5; i++) {
          this.noise(ctx, { duration: 0.04, freq: 1800 + Math.random() * 1500, q: 4, gain: 0.3, delay: i * 0.06 + Math.random() * 0.02 })
        }
        break
      case 'ping':
        this.tone(ctx, { freq: 1760 * p, type: 'sine', duration: 0.35, gain: 0.12 })
        this.tone(ctx, { freq: 2637 * p, type: 'sine', duration: 0.2, gain: 0.05 })
        break
      case 'achievement':
        ;[G5, C6, E6, G6].forEach((f, i) =>
          this.tone(ctx, { freq: f, type: 'sine', duration: 0.5, delay: i * 0.09, gain: 0.14 }),
        )
        this.noise(ctx, { duration: 0.6, filter: 'highpass', freq: 7000, gain: 0.05, delay: 0.1 })
        break
      case 'levelUp':
        ;[C5, G5, C6].forEach((f, i) => this.tone(ctx, { freq: f, type: 'triangle', duration: 0.18, delay: i * 0.1, gain: 0.2 }))
        ;[E6, G6].forEach((f) => this.tone(ctx, { freq: f, type: 'sine', duration: 0.8, delay: 0.32, gain: 0.12 }))
        break
      case 'bonus':
        for (let i = 0; i < 10; i++) {
          this.tone(ctx, { freq: 1200 + i * 180, type: 'sine', duration: 0.18, delay: i * 0.04, gain: 0.08 })
        }
        break
      case 'error':
        this.tone(ctx, { freq: 140, type: 'square', duration: 0.18, gain: 0.08 })
        break
    }
  }
}

export const sfx = new SoundEngine()

/** Short vibration on supporting mobile devices, respecting the user setting. */
export function haptic(pattern: number | number[] = 12) {
  if (!useCasino.getState().settings.haptics) return
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* unsupported */
    }
  }
}

// Keep the engine in sync with persisted settings.
const syncSettings = () => {
  const { sound, volume } = useCasino.getState().settings
  sfx.setEnabled(sound)
  sfx.setVolume(volume)
}
syncSettings()
useCasino.subscribe(syncSettings)
