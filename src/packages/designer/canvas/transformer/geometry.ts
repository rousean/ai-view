import type { Layout, Point, Rect, WidgetNode } from '@schema/types'

export interface BBox extends Rect {}

/**
 * AABB enclosing a single widget *after* its rotation is applied.
 *
 * The widget renders by rotating its layout rect around its centre, so for
 * any non-zero rotation the visual extent is larger than `layout.width` x
 * `layout.height`. This returns the screen-aligned box that just contains
 * that rotated quad.
 *
 * Formula:
 *   rotW = w·|cos R| + h·|sin R|
 *   rotH = w·|sin R| + h·|cos R|
 *   centre stays where it was
 */
export function rotatedAABB(widget: WidgetNode): BBox {
  const { x, y, width, height, rotate } = widget.layout
  if (!rotate) return { x, y, width, height }
  const r = (rotate * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  const rotW = width * c + height * s
  const rotH = width * s + height * c
  const cx = x + width / 2
  const cy = y + height / 2
  return {
    x: cx - rotW / 2,
    y: cy - rotH / 2,
    width: rotW,
    height: rotH,
  }
}

/**
 * AABB enclosing the visual extents of every widget in the list. Widgets
 * with rotation contribute their rotated AABB, not their raw layout rect.
 */
export function unionBBox(widgets: WidgetNode[]): BBox | null {
  if (widgets.length === 0) return null
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const w of widgets) {
    const r = rotatedAABB(w)
    if (r.x < minX) minX = r.x
    if (r.y < minY) minY = r.y
    if (r.x + r.width > maxX) maxX = r.x + r.width
    if (r.y + r.height > maxY) maxY = r.y + r.height
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Center of an arbitrary AABB. */
export function bboxCenter(b: BBox): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

/** Rotate point `p` around pivot by `degrees`. */
export function rotateAround(p: Point, pivot: Point, degrees: number): Point {
  const r = (degrees * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  const dx = p.x - pivot.x
  const dy = p.y - pivot.y
  return {
    x: pivot.x + dx * c - dy * s,
    y: pivot.y + dx * s + dy * c,
  }
}

/**
 * Resize handle identifier. We treat 'top'/'bottom'/'left'/'right' as
 * single-axis edge handles and the 4 corners as two-axis handles.
 */
export type ResizeHandle =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'

/** Decode a handle into "which sides move" — the inverse of "anchored". */
export function handleSides(handle: ResizeHandle): {
  movesLeft: boolean
  movesRight: boolean
  movesTop: boolean
  movesBottom: boolean
} {
  return {
    movesLeft: handle === 'left' || handle === 'top-left' || handle === 'bottom-left',
    movesRight: handle === 'right' || handle === 'top-right' || handle === 'bottom-right',
    movesTop: handle === 'top' || handle === 'top-left' || handle === 'top-right',
    movesBottom: handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right',
  }
}

/**
 * Returns which sides are anchored (do NOT move) for a given handle.
 * Kept for convenience and external consumption; internally we use
 * `handleSides` because the inverse phrasing is easier to reason about.
 */
export function anchorSides(handle: ResizeHandle): {
  left: boolean
  top: boolean
  right: boolean
  bottom: boolean
} {
  const m = handleSides(handle)
  return {
    left: !m.movesLeft,
    right: !m.movesRight,
    top: !m.movesTop,
    bottom: !m.movesBottom,
  }
}

/**
 * Compute the new bbox after dragging a handle by (dx, dy) in canvas space.
 *
 * Convention: dx > 0 means cursor moved right; dy > 0 means cursor moved down.
 * The opposite (anchored) side stays fixed unless `fromCenter` is true,
 * in which case the opposite side mirrors the moving side around the center.
 *
 * `lockAspect` (Shift): for corner handles, enforces `start.width / start.height`
 * by adjusting the dominant axis to match the secondary one.
 */
export function resizeBBox(
  start: BBox,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  opts: {
    lockAspect?: boolean
    fromCenter?: boolean
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
  } = {},
): BBox {
  const {
    lockAspect = false,
    fromCenter = false,
    minWidth = 4,
    minHeight = 4,
    maxWidth = Infinity,
    maxHeight = Infinity,
  } = opts
  const m = handleSides(handle)

  let { x, y, width, height } = start

  // ── Horizontal axis ─────────────────────────────────────────────
  if (m.movesLeft) {
    // Handle is on the left side. Drag-right (+dx) moves left edge right.
    if (fromCenter) {
      // Right edge mirrors: it moves left by dx as well.
      x += dx
      width -= 2 * dx
    } else {
      x += dx
      width -= dx
    }
  } else if (m.movesRight) {
    // Handle is on the right side. Drag-right (+dx) moves right edge right.
    if (fromCenter) {
      x -= dx
      width += 2 * dx
    } else {
      width += dx
    }
  }
  // else: edge handle on the perpendicular axis — no horizontal change.

  // ── Vertical axis ───────────────────────────────────────────────
  if (m.movesTop) {
    if (fromCenter) {
      y += dy
      height -= 2 * dy
    } else {
      y += dy
      height -= dy
    }
  } else if (m.movesBottom) {
    if (fromCenter) {
      y -= dy
      height += 2 * dy
    } else {
      height += dy
    }
  }

  // ── Aspect ratio lock (corners only) ────────────────────────────
  if (lockAspect && start.width > 0 && start.height > 0) {
    const aspect = start.width / start.height
    const isCorner = (m.movesLeft || m.movesRight) && (m.movesTop || m.movesBottom)
    if (isCorner) {
      const widthRatio = Math.abs(width / start.width)
      const heightRatio = Math.abs(height / start.height)
      if (widthRatio >= heightRatio) {
        // Width changed more — derive height from width.
        const newH = (Math.abs(width) / aspect) * Math.sign(height || 1)
        const dh = newH - height
        // Anchor the side that did NOT move.
        if (m.movesTop) y -= dh // bottom anchored — keep bottom edge fixed
        height = newH
      } else {
        const newW = Math.abs(height) * aspect * Math.sign(width || 1)
        const dw = newW - width
        if (m.movesLeft) x -= dw // right anchored
        width = newW
      }
    }
  }

  // ── Min / max clamp ──────────────────────────────────────────────
  // Respect the widget's declared capabilities (minSize / maxSize),
  // defaulting to a 4px floor so a resize can never flip the rect. The
  // anchored edge stays put: when a bound is hit we pull the dimension
  // back and shift the origin so the edge the user is NOT dragging holds
  // its position. `fromCenter` clamps symmetrically around the centre.
  const minW = Math.max(minWidth, 1)
  const minH = Math.max(minHeight, 1)
  const clampedW = Math.max(minW, Math.min(maxWidth, width))
  if (clampedW !== width) {
    const d = width - clampedW
    if (fromCenter) x += d / 2
    else if (m.movesLeft) x += d
    width = clampedW
  }
  const clampedH = Math.max(minH, Math.min(maxHeight, height))
  if (clampedH !== height) {
    const d = height - clampedH
    if (fromCenter) y += d / 2
    else if (m.movesTop) y += d
    height = clampedH
  }

  return { x, y, width, height }
}

/**
 * Apply a bbox transformation to a list of widgets. Each widget's *centre*
 * is scaled proportionally inside the bbox, and its raw width/height
 * scale by the same ratio. `rotate` is untouched (rotation handled
 * separately).
 *
 * Centre-based (rather than top-left-based) scaling is what makes this
 * compose correctly with rotated widgets: a rotated widget's visual
 * bounds live around its centre, not its layout top-left. For unrotated
 * widgets the two formulations are equivalent.
 */
export function distributeResize(
  widgets: WidgetNode[],
  oldBBox: BBox,
  newBBox: BBox,
): Array<{ id: string; layout: Partial<Layout> }> {
  const sx = oldBBox.width > 0 ? newBBox.width / oldBBox.width : 1
  const sy = oldBBox.height > 0 ? newBBox.height / oldBBox.height : 1

  return widgets.map((w) => {
    const oldCx = w.layout.x + w.layout.width / 2
    const oldCy = w.layout.y + w.layout.height / 2
    const relCx = oldCx - oldBBox.x
    const relCy = oldCy - oldBBox.y
    const newCx = newBBox.x + relCx * sx
    const newCy = newBBox.y + relCy * sy
    const newW = w.layout.width * sx
    const newH = w.layout.height * sy
    return {
      id: w.id,
      layout: {
        x: newCx - newW / 2,
        y: newCy - newH / 2,
        width: newW,
        height: newH,
      },
    }
  })
}

/**
 * Rotate all widgets around a single pivot by `deltaDeg`. Each widget's
 * center moves around the pivot, and its own `rotate` is incremented.
 */
export function distributeRotation(
  widgets: WidgetNode[],
  pivot: Point,
  deltaDeg: number,
): Array<{ id: string; layout: Partial<Layout> }> {
  return widgets.map((w) => {
    const c = {
      x: w.layout.x + w.layout.width / 2,
      y: w.layout.y + w.layout.height / 2,
    }
    const nc = rotateAround(c, pivot, deltaDeg)
    return {
      id: w.id,
      layout: {
        x: nc.x - w.layout.width / 2,
        y: nc.y - w.layout.height / 2,
        rotate: w.layout.rotate + deltaDeg,
      },
    }
  })
}
