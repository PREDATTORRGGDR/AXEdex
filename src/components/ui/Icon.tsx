import { Glyph } from './Glyph'
import { ICON_MAP, type IconName } from './iconNames'

interface IconProps {
  name: IconName
  size?: number
  className?: string
  alt?: string
  glow?: boolean
}

/** Semantic icon: resolves a name to a bright gradient glyph in its signature colour. */
export function Icon({ name, size = 24, className, alt, glow = true }: IconProps) {
  const [glyph, tone] = ICON_MAP[name]
  return <Glyph name={glyph} tone={tone} size={size} className={className} label={alt || undefined} glow={glow} />
}
