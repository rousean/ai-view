import * as React from 'react'
import { useDocumentStore } from '../../stores/document-store'
import { useEditorStore } from '../../stores/editor-store'
import { selectWidget } from '../../stores/selectors'

/**
 * Single-selection hover indicator — a dashed outline + W×H tag over the
 * widget under the cursor (when it isn't already selected). Kept separate
 * from the selection chrome: hover and selection are different concerns.
 */
export const HoverIndicator: React.FC = () => {
  const hoverId = useEditorStore((s) => s.hoverId)
  const isSelected = useEditorStore((s) => (hoverId ? s.selectedIds.includes(hoverId) : false))
  const widget = useDocumentStore((s) => (hoverId ? (selectWidget(hoverId)(s) ?? null) : null))
  const scale = useEditorStore((s) => s.camera.scale)
  if (!widget || isSelected) return null
  const stroke = Math.max(1 / scale, 0.5)

  // Match the widget's *full* transform so the dashed outline overlays the
  // rotated/flipped widget at the same orientation. Just rotate alone is
  // wrong when flipX/Y is set: rotate(R) scale(-1,1) ≠ rotate(R).
  const { rotate, flipX, flipY } = widget.layout
  const transform =
    rotate || flipX || flipY
      ? `rotate(${rotate}deg) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`
      : undefined

  return (
    <div
      className="pointer-events-none absolute origin-center"
      data-skip-snapshot
      style={{
        left: widget.layout.x,
        top: widget.layout.y,
        width: widget.layout.width,
        height: widget.layout.height,
        outline: `${stroke}px dashed color-mix(in oklch, var(--primary) 55%, transparent)`,
        outlineOffset: `-${stroke}px`,
        transform,
      }}
    >
      {/* Floating W × H tag — same idiom as the selection SizeBadge,
          but pinned to the dashed hover outline so users get an instant
          size readout on any widget they point at, without committing a
          selection. */}
      <div
        className="bg-primary/80 text-primary-foreground pointer-events-none absolute font-medium whitespace-nowrap tabular-nums"
        style={{
          left: widget.layout.width / 2,
          top: widget.layout.height + 8 / scale,
          transform: 'translate(-50%, 0)',
          fontSize: 11 / scale,
          padding: `${2 / scale}px ${6 / scale}px`,
          borderRadius: 4 / scale,
        }}
      >
        {Math.round(widget.layout.width)} × {Math.round(widget.layout.height)}
      </div>
    </div>
  )
}
