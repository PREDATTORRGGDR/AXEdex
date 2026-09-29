export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
