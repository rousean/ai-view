import * as React from 'react'
import { useDocumentState } from '../editor/editor-context'
import { selectCurrentPage } from '../stores/selectors'
import { DEFAULT_COLUMN_GRID, computeColumnRects } from './column-grid'

/**
 * Layout column-grid overlay — translucent vertical bands marking each
 * column. Lives inside CameraTransformLayer so it scales with the canvas.
 * Independent of the square GridLayer; shown whenever the page's
 * `columnGrid.enabled` is set.
 */
export const ColumnGridOverlay: React.FC = () => {
  const page = useDocumentState((s) => selectCurrentPage(s))
  const cfg = page?.columnGrid
  if (!page || !cfg?.enabled) return null

  const rects = computeColumnRects(page.canvas.width, cfg)
  if (rects.length === 0) return null

  const color = cfg.color ?? DEFAULT_COLUMN_GRID.color ?? '#7c3aed'
  const { width, height } = page.canvas
  return (
    <svg
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0"
      data-skip-snapshot
    >
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={0}
          width={r.width}
          height={height}
          fill={color}
          fillOpacity={0.08}
        />
      ))}
    </svg>
  )
}
