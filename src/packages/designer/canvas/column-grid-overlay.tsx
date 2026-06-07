import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDocumentState } from '../editor/editor-context'
import { selectCurrentPage } from '../stores/selectors'
import { DEFAULT_COLUMN_GRID, computeColumnRects } from './column-grid'

/**
 * Layout column-grid overlay — translucent vertical bands marking each
 * column. Lives inside CameraTransformLayer so it scales with the canvas.
 * Independent of the square GridLayer; shown whenever the page's
 * `columnGrid.enabled` is set.
 *
 * Subscribes only to the canvas size + columnGrid config (shallow), not
 * the whole page object — otherwise it would re-render and recompute the
 * column rects on every drag / resize frame (immer hands the page a fresh
 * identity on each mutation).
 */
export const ColumnGridOverlay: React.FC = () => {
  const data = useDocumentState(
    useShallow((s) => {
      const p = selectCurrentPage(s)
      if (!p) return null
      return { width: p.canvas.width, height: p.canvas.height, cfg: p.columnGrid }
    }),
  )

  const rects = React.useMemo(
    () => (data?.cfg?.enabled ? computeColumnRects(data.width, data.cfg) : []),
    [data],
  )

  if (!data?.cfg?.enabled || rects.length === 0) return null

  const color = data.cfg.color ?? DEFAULT_COLUMN_GRID.color ?? '#7c3aed'
  const { width, height } = data
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
