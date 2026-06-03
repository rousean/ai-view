import type { ColumnGridConfig } from '@schema/types'

/** Per-column rect (x + width) in canvas space. */
export interface ColumnRect {
  x: number
  width: number
}

/** Fallback config for pages that haven't configured one yet (UI seed). */
export const DEFAULT_COLUMN_GRID: ColumnGridConfig = {
  enabled: false,
  columns: 12,
  gutter: 16,
  margin: 48,
  color: '#7c3aed', // violet-600 — distinct from the blue selection chrome
}

/**
 * Per-column rects across the canvas. Returns `[]` when the configuration
 * leaves no usable width (margins + gutters exceed the canvas).
 */
export function computeColumnRects(canvasWidth: number, cfg: ColumnGridConfig): ColumnRect[] {
  const columns = Math.floor(cfg.columns)
  if (columns < 1) return []
  const avail = canvasWidth - cfg.margin * 2 - cfg.gutter * (columns - 1)
  if (avail <= 0) return []
  const colW = avail / columns
  const rects: ColumnRect[] = []
  for (let i = 0; i < columns; i++) {
    rects.push({ x: cfg.margin + i * (colW + cfg.gutter), width: colW })
  }
  return rects
}

/** Vertical snap x-positions: every column's left and right edge. */
export function columnEdges(canvasWidth: number, cfg: ColumnGridConfig): number[] {
  const edges: number[] = []
  for (const r of computeColumnRects(canvasWidth, cfg)) {
    edges.push(r.x, r.x + r.width)
  }
  return edges
}
