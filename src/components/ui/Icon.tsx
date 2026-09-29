import { cn } from '../../lib/cn'
import type { IconName } from './iconNames'

interface IconProps {
  name: IconName
  size?: number
  className?: string
  alt?: string
}

/**
 * Colour 3D icon (Microsoft Fluent Emoji, MIT, plus a few originals) served as
 * a static SVG so it is cached by the browser instead of inflating the bundle.
 */
export function Icon({ name, size = 24, className, alt = '' }: IconProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icons/${name}.svg`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn('shrink-0 select-none', className)}
      style={{ width: size, height: size }}
    />
  )
}
