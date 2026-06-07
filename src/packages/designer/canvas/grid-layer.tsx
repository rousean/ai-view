import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDocumentState, useEditorState } from '../editor/editor-context'
import { selectCurrentPage } from '../stores/selectors'

/**
 * Artboard grid — adapted from the legacy `Gridding` component
 * (`src/features/dashboard/edtior/canvas/coordinate.tsx`).
 *
 * Why individual `<line>` elements instead of a tiled `<pattern>`:
 * the layer sits inside CameraTransformLayer, which applies a CSS
 * `transform: scale()`. Browsers rasterize `<pattern>` tiles before
 * applying the transform, so zooming in produces visibly fuzzy / aliased
 * lines. Individual `<line>` elements stay vector all the way to the
 * raster — they remain hairline-sharp at any zoom.
 *
 * Colour: `text-primary` on the wrapping svg makes `currentColor` resolve
 * to the brand token, so the grid always reads as the shadcn `--primary`.
 * Minor / major distinction is purely opacity. `page.grid.color`, if set
 * on the document, overrides the colour at the <g> level — opacity still
 * applies on top, so the major/minor rhythm is preserved.
 *
 * Subscription: we read only the grid-relevant fields (shallow-compared)
 * instead of the whole page object. The page identity changes on every
 * document mutation (immer patches), so a broad `selectCurrentPage`
 * subscription would re-render this layer — and rebuild every `<line>` —
 * on every drag / resize frame even though the grid never changes.
 */
const MAJOR_EVERY = 5

export const GridLayer: React.FC = () => {
  const grid = useDocumentState(
    useShallow((s) => {
      const p = selectCurrentPage(s)
      if (!p) return null
      return {
        width: p.canvas.width,
        height: p.canvas.height,
        enabled: p.grid.enabled,
        size: p.grid.size,
        style: p.grid.style ?? 'lines',
        color: p.grid.color,
      }
    }),
  )
  const showGrid = useEditorState((s) => s.view.showGrid)

  // Build the line array only when the grid geometry actually changes —
  // `grid` keeps a stable reference across drag frames (useShallow), so
  // this memo holds and we don't re-create hundreds of elements per frame.
  const lines = React.useMemo(() => {
    if (!grid || grid.style === 'dots' || grid.size <= 0) return null
    const { width, height, size } = grid
    const xCount = Math.floor(width / size)
    const yCount = Math.floor(height / size)
    const out: React.ReactNode[] = []
    for (let i = 0; i <= xCount; i++) {
      const major = i % MAJOR_EVERY === 0
      const x = i * size
      out.push(
        <line
          key={`gx-${i}`}
          x1={x}
          x2={x}
          y1={0}
          y2={height}
          strokeWidth={major ? 0.5 : 0.25}
          strokeOpacity={major ? 0.5 : 0.4}
        />,
      )
    }
    for (let i = 0; i <= yCount; i++) {
      const major = i % MAJOR_EVERY === 0
      const y = i * size
      out.push(
        <line
          key={`gy-${i}`}
          x1={0}
          x2={width}
          y1={y}
          y2={y}
          strokeWidth={major ? 0.5 : 0.25}
          strokeOpacity={major ? 0.5 : 0.4}
        />,
      )
    }
    return out
  }, [grid])

  if (!grid || !showGrid || !grid.enabled) return null
  // Guard against a zero / negative grid size: `Math.floor(w / 0)` is
  // Infinity (→ `Array.from({length: Infinity})` throws) and a 0-width
  // `<pattern>` is invalid — either way the canvas would blow up.
  if (grid.size <= 0) return null

  const { width, height, color: customStroke } = grid
  const step = grid.size

  // Dot grid — a single tiled <pattern> (cheap at any density) instead of
  // thousands of <circle>s. Dots sit at cell centres.
  if (grid.style === 'dots') {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="text-primary pointer-events-none absolute inset-0"
        data-skip-snapshot
      >
        <defs>
          <pattern id="aiview-grid-dots" width={step} height={step} patternUnits="userSpaceOnUse">
            <circle
              cx={step / 2}
              cy={step / 2}
              r={0.9}
              fill={customStroke ?? 'currentColor'}
              fillOpacity={0.5}
            />
          </pattern>
        </defs>
        <rect x={0} y={0} width={width} height={height} fill="url(#aiview-grid-dots)" />
      </svg>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="text-primary pointer-events-none absolute inset-0"
      data-skip-snapshot
    >
      <g stroke={customStroke ?? 'currentColor'}>{lines}</g>
    </svg>
  )
}
