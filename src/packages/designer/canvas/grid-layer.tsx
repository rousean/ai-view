import * as React from 'react'
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
 */
const MAJOR_EVERY = 5

export const GridLayer: React.FC = () => {
  const page = useDocumentState((s) => selectCurrentPage(s))
  const showGrid = useEditorState((s) => s.view.showGrid)

  if (!page || !showGrid || !page.grid.enabled) return null

  const { width, height } = page.canvas
  const step = page.grid.size
  const xCount = Math.floor(width / step)
  const yCount = Math.floor(height / step)
  const customStroke = page.grid.color

  // Dot grid — a single tiled <pattern> (cheap at any density) instead of
  // thousands of <circle>s. Dots sit at cell centres.
  if ((page.grid.style ?? 'lines') === 'dots') {
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
      <g stroke={customStroke ?? 'currentColor'}>
        {Array.from({ length: xCount + 1 }, (_, i) => {
          const major = i % MAJOR_EVERY === 0
          const x = i * step
          return (
            <line
              key={`gx-${i}`}
              x1={x}
              x2={x}
              y1={0}
              y2={height}
              strokeWidth={major ? 0.5 : 0.25}
              strokeOpacity={major ? 0.5 : 0.4}
            />
          )
        })}
        {Array.from({ length: yCount + 1 }, (_, i) => {
          const major = i % MAJOR_EVERY === 0
          const y = i * step
          return (
            <line
              key={`gy-${i}`}
              x1={0}
              x2={width}
              y1={y}
              y2={y}
              strokeWidth={major ? 0.5 : 0.25}
              strokeOpacity={major ? 0.5 : 0.4}
            />
          )
        })}
      </g>
    </svg>
  )
}
