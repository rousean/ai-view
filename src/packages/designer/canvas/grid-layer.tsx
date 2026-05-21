import * as React from 'react'
import type { Background } from '@schema/types'
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

  // Grid colour follows the **artboard** background, not the app theme —
  // the artboard is document content, so its colour is independent of the
  // shell's light/dark mode. We pick a colour that guarantees contrast:
  //   - light artboard (default white): brand blue tint
  //   - dark artboard  (e.g. #0a1929):  luminous white overlay
  // `page.grid.color`, if explicitly set on the document, always wins.
  const onDark = backgroundLuminance(page.canvas.background) < 0.5
  const minorStroke =
    page.grid.color ??
    (onDark ? 'rgba(255,255,255,0.08)' : 'color-mix(in oklch, var(--primary) 30%, transparent)')
  const majorStroke =
    page.grid.color ??
    (onDark ? 'rgba(255,255,255,0.18)' : 'color-mix(in oklch, var(--primary) 40%, transparent)')

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

// ─── Background luminance ──────────────────────────────────────────────
// Rec. 709 luma weights. Returns a 0–1 number; 0.5 is a 50% gray.
// Used to pick a grid colour with enough contrast against the artboard.

function backgroundLuminance(bg: Background): number {
  switch (bg.type) {
    case 'color':
      return colorLuminance(bg.color)
    case 'gradient': {
      // Average the first and last stop. Good enough for grid contrast —
      // gradients with extreme stops are uncommon for big-screen artboards.
      const stops = bg.gradient.stops
      const first = stops[0]?.color
      const last = stops[stops.length - 1]?.color
      const a = first ? colorLuminance(first) : 1
      const b = last ? colorLuminance(last) : 1
      return (a + b) / 2
    }
    case 'image':
    case 'transparent':
    default:
      // Unknown / transparent — assume light. Document-images-on-dark is
      // unusual; if it bites, expose `page.grid.color` from the UI so the
      // designer can pin it.
      return 1
  }
}

function colorLuminance(c: string): number {
  let r = 1
  let g = 1
  let b = 1
  if (c.startsWith('#')) {
    const hex = c.slice(1)
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255
      g = parseInt(hex[1] + hex[1], 16) / 255
      b = parseInt(hex[2] + hex[2], 16) / 255
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16) / 255
      g = parseInt(hex.slice(2, 4), 16) / 255
      b = parseInt(hex.slice(4, 6), 16) / 255
    }
  } else if (c.startsWith('rgb')) {
    const nums = c.match(/-?\d*\.?\d+/g)
    if (nums && nums.length >= 3) {
      r = parseFloat(nums[0]) / 255
      g = parseFloat(nums[1]) / 255
      b = parseFloat(nums[2]) / 255
    }
  }
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
