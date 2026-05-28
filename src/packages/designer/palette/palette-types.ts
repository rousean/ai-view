/**
 * Project-scoped colour palette — the single source of truth for "what
 * colours this dashboard uses". Stored at
 * `project.extensions.palette` so the core schema stays unchanged and
 * the runtime renderer can read it the same way.
 *
 * Two layers:
 *   - Semantic tokens — small fixed set (primary/text/muted/…) used by
 *     widget chrome (titles, axes, single-series fills). ColorSetter
 *     surfaces these as quick-pick chips.
 *   - `series` palette — categorical colour ramp for multi-series
 *     charts (donut slices, multi-line series).
 *
 * Picking a token doesn't bind the prop to it — we resolve eagerly and
 * write the literal hex into props. That keeps the runtime renderer
 * dumb (no token resolution at runtime) and lets the user override
 * one-off, which is the common case.
 */
export interface ProjectPalette {
  /** Headline colour — single-series fills, KPIs, accents. */
  primary: string
  /** Secondary accent — comparison/highlight series. */
  secondary: string
  /** Main readable text colour (titles, big numbers). */
  text: string
  /** Subdued text — axis labels, legend, secondary captions. */
  muted: string
  /** Axis lines. */
  axis: string
  /** Grid / split lines. */
  grid: string
  /** Categorical series palette — 6-8 entries. */
  series: string[]
  /** Optional id of the template the palette was last seeded from. */
  templateId?: string
}

/** Project-level extension key under `project.extensions[PALETTE_EXT_KEY]`. */
export const PALETTE_EXT_KEY = 'palette'

/** Stored under `project.extensions.palette`. */
export interface ProjectPaletteExtension {
  palette: ProjectPalette
}

/**
 * Default palette applied to projects that don't have one yet. Matches
 * the 「商务亮」 template so existing widgets keep their look. We
 * never want a project with `palette === undefined` once the panel has
 * been opened once.
 */
export const DEFAULT_PROJECT_PALETTE: ProjectPalette = {
  primary: '#0D99FF',
  secondary: '#7C5CFF',
  text: '#1E1E1E',
  muted: '#5B5B5B',
  axis: '#9CA3AF',
  grid: '#E5E7EB',
  series: ['#0D99FF', '#00C49A', '#FFB020', '#FF5E62', '#7C5CFF', '#22C55E'],
}

/** Human-readable labels for the semantic tokens — used by the editor UI. */
export const TOKEN_LABELS: Record<Exclude<keyof ProjectPalette, 'series' | 'templateId'>, string> = {
  primary: '主色',
  secondary: '辅色',
  text: '文本',
  muted: '次文本',
  axis: '轴线',
  grid: '网格',
}

/** Ordered list for UI rendering — keeps the chip order stable. */
export const TOKEN_KEYS: Array<Exclude<keyof ProjectPalette, 'series' | 'templateId'>> = [
  'primary',
  'secondary',
  'text',
  'muted',
  'axis',
  'grid',
]
