import type { Guide } from '@schema/types'

/** Axis-aligned rectangle in canvas space. */
export interface SnapRect {
  x: number
  y: number
  width: number
  height: number
}

/** Snap target categories — used for guide styling / debugging. */
export type SnapTargetType =
  | 'edge' // element edge to another element edge
  | 'center' // element centre to another element centre
  | 'page-edge' // element edge to page edge
  | 'page-center' // element centre to page centre
  | 'guide' // user-drawn guide
  | 'grid' // grid line
  | 'column' // layout column-grid edge

/** Per-side toggles for which sides of the moving rect can act as snap sources. */
export interface SnapSides {
  left?: boolean
  right?: boolean
  top?: boolean
  bottom?: boolean
  /** Centre-x of moving rect can align. */
  centerX?: boolean
  /** Centre-y of moving rect can align. */
  centerY?: boolean
}

/** Inputs the snap engine considers for candidate positions. */
export interface SnapContext {
  /** Other (non-moving) elements' visual rects in canvas space. */
  staticRects: SnapRect[]
  /** Page canvas dimensions; pass null to disable canvas snapping. */
  canvas: { width: number; height: number } | null
  /** User-drawn guides. */
  guides: Guide[]
  /** Grid configuration; pass null to disable grid snapping. */
  grid: { size: number } | null
  /** Layout column-grid edge x-positions; pass null to disable. */
  columns: number[] | null
}

/** Toggles for each snap strategy. */
export interface SnapToggles {
  toElements: boolean
  toCanvas: boolean
  toGuides: boolean
  toGrid: boolean
}

/** A single alignment guide to highlight during the gesture. */
export interface ActiveSnapGuide {
  orientation: 'h' | 'v'
  /** canvas-space position */
  position: number
  type: SnapTargetType
}

/** Result of a snap query. */
export interface SnapResult {
  /** Offset to apply to the moving rect; (0, 0) when nothing matched. */
  delta: { x: number; y: number }
  /** Lines to render through the snap targets. */
  guides: ActiveSnapGuide[]
}
