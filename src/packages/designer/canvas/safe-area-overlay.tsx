import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDocumentStore } from '../stores/document-store'
import { useEditorStore } from '../stores/editor-store'
import { selectCurrentPage } from '../stores/selectors'

/**
 * Safe-area frame — a dashed rectangle inset by a margin from each canvas
 * edge, for keeping critical content clear of screen bezels on large
 * displays. Lives inside CameraTransformLayer (canvas space); the stroke
 * counter-scales to stay ~1px on screen at any zoom.
 *
 * Subscribes only to the canvas size + safeArea config (shallow) so it
 * doesn't re-render on every drag / resize frame (the page object's
 * identity changes on every document mutation).
 */
export const SafeAreaOverlay: React.FC = () => {
  const data = useDocumentStore(
    useShallow((s) => {
      const p = selectCurrentPage(s)
      if (!p) return null
      return { width: p.canvas.width, height: p.canvas.height, safeArea: p.canvas.safeArea }
    }),
  )
  const scale = useEditorStore((s) => s.camera.scale)
  if (!data) return null
  const sa = data.safeArea
  if (!sa?.enabled || sa.margin <= 0) return null
  const { width, height } = data
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
