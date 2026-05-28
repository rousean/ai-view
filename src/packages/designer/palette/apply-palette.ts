import type { ProjectPalette } from './palette-types'

/**
 * Infer a colour patch for a widget's props given the project palette.
 * Replaces the Sprint-2 `theme-applier` algorithm — but called from two
 * specific entry points instead of "broadcast to every widget":
 *
 *   1. On `addWidget` — patch defaultProps so new widgets start in the
 *      project palette (otherwise they ship the meta's hardcoded blue).
 *   2. Optional "把现有组件刷成色板色" — user explicitly opts in via a
 *      button in the PaletteEditor (NOT automatic on palette change,
 *      to respect the user's per-widget overrides).
 *
 * Heuristics by prop name:
 *   - `barColor` / `fillColor`                  → primary
 *   - `*Color` ending paths (titleColor)        → text (if "title") else muted
 *   - compound `*Font` ({color,size,weight})    → recoloured by same logic
 *   - `axisColor` / arrays of series colours    → axis / series palette
 */
export function inferPalettePatch(
  props: Record<string, unknown>,
  palette: ProjectPalette,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    if (key === 'barColor' || key === 'fillColor') {
      patch[key] = palette.primary
      continue
    }
    if (key === 'axisColor') {
      patch[key] = palette.axis
      continue
    }
    if (key === 'gridColor' || key === 'splitColor') {
      patch[key] = palette.grid
      continue
    }
    // Compound font bag — { color, size, weight, italic }
    if (key.endsWith('Font') && value && typeof value === 'object') {
      const lower = key.toLowerCase()
      const targetColor = lower.includes('title')
        ? palette.text
        : palette.muted
      patch[key] = { ...(value as object), color: targetColor }
      continue
    }
    // Plain *Color suffix paths (title-style legacy props, kept for
    // backward compat with widgets that haven't migrated to FontStyle).
    if (key.endsWith('Color') && typeof value === 'string') {
      const lower = key.toLowerCase()
      patch[key] = lower.includes('title') ? palette.text : palette.muted
      continue
    }
  }

  return patch
}

/**
 * Convenience — combine props with a palette patch in one call. Used by
 * `addWidget` to spawn pre-coloured new widgets.
 */
export function paintPropsWithPalette<T extends Record<string, unknown>>(
  props: T,
  palette: ProjectPalette,
): T {
  return { ...props, ...inferPalettePatch(props, palette) }
}
