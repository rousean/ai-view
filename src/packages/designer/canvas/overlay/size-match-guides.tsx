import * as React from 'react'
import { useDocumentStore } from '../../stores/document-store'
import { useEditorStore } from '../../stores/editor-store'
import { selectCurrentPage } from '../../stores/selectors'
import { useSizeMatchStore } from '../../snap/size-match-store'

/**
 * "Equal size" markers shown during a size-snap — a pair of pink bars of
 * identical length (one on the moving widget, one on the sibling it
 * matched), with perpendicular end-caps. Lives inside the camera layer so
 * coordinates are canvas-space; strokes counter-scale to ~1.5px on screen.
 *
 * Pink (`#ec4899`) matches the distance-guides so all "measurement" hints
 * share a colour, distinct from the orange alignment guides and the blue
 * selection chrome.
 */
export const SizeMatchGuides: React.FC = () => {
  const segments = useSizeMatchStore((s) => s.segments)
  const page = useDocumentStore((s) => selectCurrentPage(s))
  const scale = useEditorStore((s) => s.camera.scale)

  if (segments.length === 0 || !page) return null

  const stroke = Math.max(1.5 / scale, 0.5)
  const cap = 4 / scale // half-length of the perpendicular end-caps
  const color = '#ec4899' // pink-500

  return (
    <svg
      data-skip-snapshot
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
      style={{ width: page.canvas.width, height: page.canvas.height }}
    >
      {segments.map((s, i) => (
        <g key={i} stroke={color} strokeWidth={stroke}>
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
          {s.orientation === 'h' ? (
            <>
              <line x1={s.x1} y1={s.y1 - cap} x2={s.x1} y2={s.y1 + cap} />
              <line x1={s.x2} y1={s.y2 - cap} x2={s.x2} y2={s.y2 + cap} />
            </>
          ) : (
            <>
              <line x1={s.x1 - cap} y1={s.y1} x2={s.x1 + cap} y2={s.y1} />
              <line x1={s.x2 - cap} y1={s.y2} x2={s.x2 + cap} y2={s.y2} />
            </>
          )}
        </g>
      ))}
    </svg>
  )
}
