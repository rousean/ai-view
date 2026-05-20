import type { Background } from './common'
import type { Guide } from './guide'
import type { WidgetNode } from './widget-node'

/** Fixed canvas (artboard) configuration. */
export interface CanvasConfig {
  width: number
  height: number
  orientation: 'landscape' | 'portrait'
  background: Background
}

/** Grid configuration: visibility + snap behavior. */
export interface GridConfig {
  enabled: boolean
  /** Cell size in canvas pixels. */
  size: number
  /** Whether widgets snap to grid. */
  snap: boolean
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
