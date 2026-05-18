import * as React from 'react'
import { useDocumentStore } from '../../stores/document-store'
import { useEditorStore } from '../../stores/editor-store'
import { selectCurrentPage } from '../../stores/selectors'
import { useSnapGuidesStore } from '../../snap/snap-store'

/**
 * Magenta dashed lines drawn through every active snap target during a
 * gesture. Lives inside the camera-transformed layer so its positions
 * are canvas-space. Strokes counter-scale to stay 1px on screen.
 *
 * Lines extend across the whole page artboard for now — good enough
 * for a first pass; we can shorten them to "between involved widgets"
 * later if needed.
 */
export const AlignmentGuidesOverlay: React.FC = () => {
  const guides = useSnapGuidesStore((s) => s.guides)
  const page = useDocumentStore((s) => selectCurrentPage(s))
  const scale = useEditorStore((s) => s.camera.scale)
  const showAlignmentGuides = useEditorStore((s) => s.view.showAlignmentGuides)

  if (!showAlignmentGuides || guides.length === 0 || !page) return null

  const stroke = Math.max(1 / scale, 0.5)
  const dash = `${4 / scale} ${4 / scale}`
  // Themed via --alignment-color (default magenta, distinct from selection blue).
  const color = 'var(--alignment-color, #ec4899)'

  return (
    <svg
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: page.canvas.width,
        height: page.canvas.height,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {guides.map((g, i) =>
        g.orientation === 'v' ? (
          <line
            key={`v-${i}-${g.position}-${g.type}`}
            x1={g.position}
            y1={0}
            x2={g.position}
            y2={page.canvas.height}
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={dash}
          />
        ) : (
          <line
            key={`h-${i}-${g.position}-${g.type}`}
            x1={0}
            y1={g.position}
            x2={page.canvas.width}
            y2={g.position}
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={dash}
          />
        ),
      )}
    </svg>
  )
}
