import type { Background } from './common'
import type { Guide } from './guide'
import type { WidgetNode } from './widget-node'

/** Fixed canvas (artboard) configuration. */
export interface CanvasConfig {
  width: number
  height: number
  orientation: 'landscape' | 'portrait'
  background: Background
  /** Optional safe-area frame: a margin (px) inset from every edge. */
  safeArea?: { enabled: boolean; margin: number }
}

/** Grid configuration: visibility + snap behavior. */
export interface GridConfig {
  enabled: boolean
  /** Cell size in canvas pixels. */
  size: number
  /** Whether widgets snap to grid. */
  snap: boolean
  color?: string
  /** Grid rendering style. Defaults to 'lines'. */
  style?: 'lines' | 'dots'
}

/**
 * Layout column grid (大屏排版列栅格) — N evenly-sized columns with a gap
 * (`gutter`) between them and an outer `margin` on the left/right. Acts as
 * a visual overlay + snap target so widgets line up to a column system the
 * way print / web layout grids do. Independent of the square `grid`.
 */
export interface ColumnGridConfig {
  enabled: boolean
  /** Number of columns (>= 1). */
  columns: number
  /** Gap between columns, in canvas px. */
  gutter: number
  /** Left/right outer margin, in canvas px. */
  margin: number
  color?: string
}

/** Page transition (large-screen carousels). */
export interface PageTransition {
  /** Registry key: 'fade' | 'slide' | 'none' | ... */
  type: string
  duration: number
  /** Auto-rotate carousel. */
  autoplay?: { enabled: boolean; interval: number }
}

/** A page = one fixed canvas of widgets. A project may contain multiple. */
export interface Page {
  id: string
  name: string

  canvas: CanvasConfig
  grid: GridConfig

  /** Optional layout column grid (排版列栅格). Absent → disabled. */
  columnGrid?: ColumnGridConfig

  /** User-drawn guidelines. */
  guides: Guide[]

  /**
   * Widgets in render order: index 0 is rendered first (bottom),
   * last index is on top. Move-up/down operations mutate this array.
   */
  widgets: WidgetNode[]

  /** Transition into this page (used during page switching/carousels). */
  transition?: PageTransition

  extensions: Record<string, unknown>
}
