import { useId } from 'react'

/**
 * Unique, url()-safe id for SVG gradients/filters. Shared ids break when the
 * first definition lives inside a `display: none` subtree (e.g. a hidden sidebar).
 */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}
