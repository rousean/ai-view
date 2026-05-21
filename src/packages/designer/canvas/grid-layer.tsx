import * as React from 'react'
import { useDocumentState, useEditorState } from '../editor/editor-context'
import { selectCurrentPage } from '../stores/selectors'

/**
 * Two-tier line grid covering the artboard, ported from the legacy
 * `Gridding`. Thin "minor" lines every `grid.size` px, thicker "major"
 * lines every `MAJOR_EVERY * grid.size` px.
 *
 * Implemented with two stacked SVG `<pattern>`s so the browser tiles them
 * efficiently — no React work proportional to canvas dimensions.
 */
const MAJOR_EVERY = 5

export const GridLayer: React.FC = () => {
  const page = useDocumentState((s) => selectCurrentPage(s))
  const showGrid = useEditorState((s) => s.view.showGrid)

  // Hooks must run on every render path — keep useId calls above the
  // early-return guards. (Pattern lessons learned from editor-root.tsx
  // hooks-order bug.)
  const minorId = React.useId()
  const majorId = React.useId()

  if (!page || !showGrid || !page.grid.enabled) return null

  const { width, height } = page.canvas
  const minor = page.grid.size
  const major = minor * MAJOR_EVERY
  // Stroke colours carry their own alpha — we never compound with
  // `strokeOpacity` because `page.grid.color` is usually an `rgba(...)`
  // string already (default light artboard uses ~5% black) and a second
  // multiplication would render the grid invisible.
  //
  // When the document doesn't pin a colour, fall back to the brand
  // `--primary` mixed with transparency so it reads as a subtle blue tint.
  const minorStroke =
    page.grid.color ?? 'color-mix(in oklch, var(--primary) 30%, transparent)'
  const majorStroke =
    page.grid.color ?? 'color-mix(in oklch, var(--primary) 40%, transparent)'

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <pattern id={minorId} width={minor} height={minor} patternUnits="userSpaceOnUse">
          {/* L-shaped stroke at the cell's top + left so tiling makes a grid. */}
          <path
            d={`M ${minor} 0 L 0 0 L 0 ${minor}`}
            fill="none"
            stroke={minorStroke}
            strokeWidth={0.5}
          />
        </pattern>
        <pattern id={majorId} width={major} height={major} patternUnits="userSpaceOnUse">
          <path
            d={`M ${major} 0 L 0 0 L 0 ${major}`}
            fill="none"
            stroke={majorStroke}
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${minorId})`} />
      <rect width="100%" height="100%" fill={`url(#${majorId})`} />
    </svg>
  )
}
