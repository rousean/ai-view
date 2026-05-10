import type { Layout, Point, Rect, WidgetNode } from '@schema/types';

export interface BBox extends Rect {}

/** Compute the AABB enclosing the given widgets in canvas space. */
export function unionBBox(widgets: WidgetNode[]): BBox | null {
  if (widgets.length === 0) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const w of widgets) {
    minX = Math.min(minX, w.layout.x);
    minY = Math.min(minY, w.layout.y);
    maxX = Math.max(maxX, w.layout.x + w.layout.width);
    maxY = Math.max(maxY, w.layout.y + w.layout.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Center of an arbitrary AABB. */
export function bboxCenter(b: BBox): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Rotate point `p` around pivot by `degrees`. */
export function rotateAround(p: Point, pivot: Point, degrees: number): Point {
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return {
    x: pivot.x + dx * c - dy * s,
    y: pivot.y + dx * s + dy * c,
  };
}

/**
 * Resize handle identifier. We treat 'top'/'bottom'/'left'/'right' as
 * single-axis handles and the 4 corners as two-axis handles.
 */
export type ResizeHandle =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left';

/** Returns which sides are anchored (do not move) for a given handle. */
export function anchorSides(handle: ResizeHandle): {
  left: boolean;
  top: boolean;
  right: boolean;
  bottom: boolean;
} {
  switch (handle) {
    case 'top-left':
      return { left: false, top: false, right: true, bottom: true };
    case 'top':
      return { left: false, top: false, right: false, bottom: true };
    case 'top-right':
      return { left: true, top: false, right: false, bottom: true };
    case 'right':
      return { left: true, top: false, right: false, bottom: false };
    case 'bottom-right':
      return { left: true, top: true, right: false, bottom: false };
    case 'bottom':
      return { left: false, top: true, right: false, bottom: false };
    case 'bottom-left':
      return { left: false, top: true, right: false, bottom: false };
    case 'left':
      return { left: false, top: false, right: true, bottom: false };
  }
}

/**
 * Compute the new bbox after dragging a handle by (dx, dy) in canvas space.
 * Honors aspect ratio lock (shift) and from-center (alt).
 *
 * The original bbox is unchanged; its absolute coords are passed in.
 */
export function resizeBBox(
  start: BBox,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  opts: { lockAspect?: boolean; fromCenter?: boolean } = {},
): BBox {
  const { lockAspect = false, fromCenter = false } = opts;

  let { x, y, width, height } = start;
  const a = anchorSides(handle);

  // Apply raw deltas relative to which sides move.
  if (fromCenter) {
    if (!a.left) {
      x -= dx;
      width += dx * 2;
    } else if (!a.right) {
      x += dx;
      width -= dx * 2;
      // For from-center, treat the opposite side as also moving.
      // (We handled left=false => width grows by 2dx; here right=false => same direction)
    }
    if (!a.top) {
      y -= dy;
      height += dy * 2;
    } else if (!a.bottom) {
      y += dy;
      height -= dy * 2;
    }
  } else {
    if (!a.left) {
      // left side fixed, right side moves
      width += dx;
    } else {
      // left side moves, right side fixed
      x += dx;
      width -= dx;
    }
    if (!a.top) {
      height += dy;
    } else {
      y += dy;
      height -= dy;
    }
  }

  // Aspect ratio lock — derive the dominant axis and propagate.
  if (lockAspect && start.width > 0 && start.height > 0) {
    const aspect = start.width / start.height;
    const widthRatio = Math.abs(width / start.width);
    const heightRatio = Math.abs(height / start.height);
    const isCorner =
      handle === 'top-left' ||
      handle === 'top-right' ||
      handle === 'bottom-left' ||
      handle === 'bottom-right';
    if (isCorner) {
      // Use the larger of the two relative changes.
      if (widthRatio >= heightRatio) {
        const newH = Math.abs(width) / aspect * Math.sign(height || 1);
        const dh = newH - height;
        if (a.top) y -= dh;
        height = newH;
      } else {
        const newW = Math.abs(height) * aspect * Math.sign(width || 1);
        const dw = newW - width;
        if (a.left) x -= dw;
        width = newW;
      }
    }
  }

  // Don't allow flipping during a resize: clamp to a tiny min.
  const MIN = 4;
  if (width < MIN) {
    if (a.left) x -= MIN - width; // anchor was left? fix x to keep right edge
    width = MIN;
  }
  if (height < MIN) {
    if (a.top) y -= MIN - height;
    height = MIN;
  }

  return { x, y, width, height };
}

/**
 * Apply a bbox transformation to a list of widgets. The widgets' positions
 * and sizes are scaled proportionally inside the bbox; their `rotate` is
 * untouched (rotation handled separately).
 *
 * Returns layout deltas to apply via editor.updateLayoutBatch.
 */
export function distributeResize(
  widgets: WidgetNode[],
  oldBBox: BBox,
  newBBox: BBox,
): Array<{ id: string; layout: Partial<Layout> }> {
  // Avoid divide-by-zero when bbox has 0 width/height (single point selection).
  const sx = oldBBox.width > 0 ? newBBox.width / oldBBox.width : 1;
  const sy = oldBBox.height > 0 ? newBBox.height / oldBBox.height : 1;

  return widgets.map((w) => {
    const relX = w.layout.x - oldBBox.x;
    const relY = w.layout.y - oldBBox.y;
    return {
      id: w.id,
      layout: {
        x: newBBox.x + relX * sx,
        y: newBBox.y + relY * sy,
        width: w.layout.width * sx,
        height: w.layout.height * sy,
      },
    };
  });
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
    };
    const nc = rotateAround(c, pivot, deltaDeg);
    return {
      id: w.id,
      layout: {
        x: nc.x - w.layout.width / 2,
        y: nc.y - w.layout.height / 2,
        rotate: w.layout.rotate + deltaDeg,
      },
    };
  });
}
