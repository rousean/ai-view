import * as React from 'react'
import { useDocumentStore } from '../stores/document-store'
import { useEditorStore } from '../stores/editor-store'
import { selectCurrentPage } from '../stores/selectors'

/**
 * Safe-area frame — a dashed rectangle inset by a margin from each canvas
 * edge, for keeping critical content clear of screen bezels on large
 * displays. Lives inside CameraTransformLayer (canvas space); the stroke
 * counter-scales to stay ~1px on screen at any zoom.
 */
export const SafeAreaOverlay: React.FC = () => {
  const page = useDocumentStore((s) => selectCurrentPage(s))
  const scale = useEditorStore((s) => s.camera.scale)
  if (!page) return null
  const sa = page.canvas.safeArea
  if (!sa?.enabled || sa.margin <= 0) return null
  const { width, height } = page.canvas
  const m = sa.margin
  const w = width - m * 2
  const h = height - m * 2
  if (w <= 0 || h <= 0) return null
  const stroke = Math.max(1 / scale, 0.5)
  return (
    <svg
      className="text-primary pointer-events-none absolute top-0 left-0 overflow-visible"
      style={{ width, height }}
      data-skip-snapshot
    >
      <rect
        x={m}
        y={m}
        width={w}
        height={h}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={stroke}
        strokeDasharray={`${8 / scale} ${5 / scale}`}
      />
    </svg>
  )
}
