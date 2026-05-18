import type {
  ActiveSnapGuide,
  SnapContext,
  SnapRect,
  SnapResult,
  SnapSides,
  SnapTargetType,
  SnapToggles,
} from './types'

/**
 * Default screen-pixel thresholds per snap category. Larger thresholds
 * "win" — i.e. user guides should beat grid snap when both are close.
 * Caller is responsible for dividing by camera scale to get canvas px.
 */
export const DEFAULT_THRESHOLDS = {
  guide: 8,
  element: 5,
  canvas: 5,
  grid: 3,
}

interface SnapCandidate {
  position: number // canvas-space coord on the relevant axis
  type: SnapTargetType
  /** Per-category priority — lower wins ties. */
  priority: number
  /** Canvas px tolerance for this candidate. */
  threshold: number
}

/**
 * SnapManager — given a "moving" rect and a context of static targets, find
 * the smallest axis-aligned offset that aligns one of the moving rect's
 * snap-source sides (left / right / centre-x / top / bottom / centre-y)
 * with one of the candidate positions.
 *
 * X and Y are computed independently and combined. Each axis returns at
 * most one snap, so the resulting delta has 0 to 2 active components.
 *
 * `screenThreshold` is in screen pixels; the manager divides by
 * `cameraScale` so snapping always feels like "5px on screen" regardless
 * of zoom.
 */
export class SnapManager {
  constructor(
    public toggles: SnapToggles = {
      toElements: true,
      toCanvas: true,
      toGuides: true,
      toGrid: false,
    },
  ) {}

  configure(patch: Partial<SnapToggles>): void {
    this.toggles = { ...this.toggles, ...patch }
  }

  /**
   * Compute the snap correction for a moving rect.
   * @param movingRect    the rect being moved/resized
   * @param sides         which sides of the moving rect can act as snap sources
   * @param ctx           candidate sources (static rects, page, guides, grid)
   * @param cameraScale   current camera scale (1 = 100%)
   */
  snap(movingRect: SnapRect, sides: SnapSides, ctx: SnapContext, cameraScale = 1): SnapResult {
    const candidates = this.collectCandidates(ctx, cameraScale)

    // Moving-rect source positions per axis.
    const xSources: Array<{ key: keyof SnapSides; pos: number }> = []
    const ySources: Array<{ key: keyof SnapSides; pos: number }> = []
    if (sides.left) xSources.push({ key: 'left', pos: movingRect.x })
    if (sides.right) xSources.push({ key: 'right', pos: movingRect.x + movingRect.width })
    if (sides.centerX) xSources.push({ key: 'centerX', pos: movingRect.x + movingRect.width / 2 })
    if (sides.top) ySources.push({ key: 'top', pos: movingRect.y })
    if (sides.bottom) ySources.push({ key: 'bottom', pos: movingRect.y + movingRect.height })
    if (sides.centerY) ySources.push({ key: 'centerY', pos: movingRect.y + movingRect.height / 2 })

    const xSnap = bestSnap(xSources, candidates.x)
    const ySnap = bestSnap(ySources, candidates.y)

    const guides: ActiveSnapGuide[] = []
    if (xSnap) guides.push({ orientation: 'v', position: xSnap.target, type: xSnap.type })
    if (ySnap) guides.push({ orientation: 'h', position: ySnap.target, type: ySnap.type })

    return {
      delta: {
        x: xSnap ? xSnap.target - xSnap.source : 0,
        y: ySnap ? ySnap.target - ySnap.source : 0,
      },
      guides,
    }
  }

  // ── Candidate collection ──────────────────────────────────────────

  private collectCandidates(
    ctx: SnapContext,
    scale: number,
  ): {
    x: SnapCandidate[]
    y: SnapCandidate[]
  } {
    const x: SnapCandidate[] = []
    const y: SnapCandidate[] = []

    // User guides — highest priority.
    if (this.toggles.toGuides) {
      const th = DEFAULT_THRESHOLDS.guide / scale
      for (const g of ctx.guides) {
        if (g.orientation === 'vertical')
          x.push({ position: g.position, type: 'guide', priority: 0, threshold: th })
        else y.push({ position: g.position, type: 'guide', priority: 0, threshold: th })
      }
    }

    // Element edges and centres.
    if (this.toggles.toElements) {
      const th = DEFAULT_THRESHOLDS.element / scale
      for (const r of ctx.staticRects) {
        // X candidates
        x.push({ position: r.x, type: 'edge', priority: 1, threshold: th })
        x.push({ position: r.x + r.width, type: 'edge', priority: 1, threshold: th })
        x.push({ position: r.x + r.width / 2, type: 'center', priority: 2, threshold: th })
        // Y candidates
        y.push({ position: r.y, type: 'edge', priority: 1, threshold: th })
        y.push({ position: r.y + r.height, type: 'edge', priority: 1, threshold: th })
        y.push({ position: r.y + r.height / 2, type: 'center', priority: 2, threshold: th })
      }
    }

    // Canvas edges and centre.
    if (this.toggles.toCanvas && ctx.canvas) {
      const th = DEFAULT_THRESHOLDS.canvas / scale
      x.push({ position: 0, type: 'page-edge', priority: 3, threshold: th })
      x.push({ position: ctx.canvas.width, type: 'page-edge', priority: 3, threshold: th })
      x.push({ position: ctx.canvas.width / 2, type: 'page-center', priority: 4, threshold: th })
      y.push({ position: 0, type: 'page-edge', priority: 3, threshold: th })
      y.push({ position: ctx.canvas.height, type: 'page-edge', priority: 3, threshold: th })
      y.push({ position: ctx.canvas.height / 2, type: 'page-center', priority: 4, threshold: th })
    }

    // Grid — synthesized lazily (treat as a single candidate generator).
    // We don't pre-enumerate; bestSnap() handles grid via a special check.
    if (this.toggles.toGrid && ctx.grid && ctx.grid.size > 0) {
      const th = DEFAULT_THRESHOLDS.grid / scale
      x.push({ position: Number.NaN, type: 'grid', priority: 5, threshold: th })
      y.push({ position: Number.NaN, type: 'grid', priority: 5, threshold: th })
      // Stash the grid size in a side channel — see GRID_SIZE_KEY in bestSnap.
      ;(x[x.length - 1] as { gridSize?: number }).gridSize = ctx.grid.size
      ;(y[y.length - 1] as { gridSize?: number }).gridSize = ctx.grid.size
    }

    return { x, y }
  }
}

/**
 * Pick the snap with the smallest absolute offset among all (source, candidate)
 * pairs whose distance is within the candidate's threshold. Ties are broken
 * by candidate priority (lower wins).
 */
function bestSnap(
  sources: Array<{ pos: number }>,
  candidates: SnapCandidate[],
): { source: number; target: number; type: SnapTargetType } | null {
  let best: {
    source: number
    target: number
    type: SnapTargetType
    distance: number
    priority: number
  } | null = null

  for (const c of candidates) {
    for (const s of sources) {
      let candidatePos: number

      if (c.type === 'grid') {
        // Snap source to nearest grid line.
        const gridSize = (c as { gridSize?: number }).gridSize ?? 0
        if (gridSize <= 0) continue
        candidatePos = Math.round(s.pos / gridSize) * gridSize
      } else {
        candidatePos = c.position
      }

      const distance = Math.abs(s.pos - candidatePos)
      if (distance > c.threshold) continue

      if (
        !best ||
        distance < best.distance - 0.001 ||
        (Math.abs(distance - best.distance) < 0.001 && c.priority < best.priority)
      ) {
        best = {
          source: s.pos,
          target: candidatePos,
          type: c.type,
          distance,
          priority: c.priority,
        }
      }
    }
  }

  return best ? { source: best.source, target: best.target, type: best.type } : null
}
