import * as React from 'react'
import { useDocumentStore } from '../stores/document-store'
import { useEditorStore } from '../stores/editor-store'
import { selectCurrentPage } from '../stores/selectors'
import { useMoveGuideGesture } from './interaction/use-move-guide-gesture'

interface Props {
  /** Ref to the canvas viewport — used to convert pointer ⇄ canvas space. */
  viewportRef: React.RefObject<HTMLElement | null>
}

/**
 * Renders every persisted guide on the current page, plus a dashed
 * preview line while the user is dragging one out of a ruler.
 *
 * Lives inside CameraTransformLayer so positions are canvas-space.
 * Strokes counter-scale (Math.max(1/scale, 0.5)) to stay 1px on screen
 * regardless of zoom — same trick the selection chrome uses.
 *
 * Each persisted guide gets a slim hit area on top of its line that
 * starts the move gesture on pointer-down.
 */
export const GuidesOverlay: React.FC<Props> = ({ viewportRef }) => {
  const page = useDocumentStore((s) => selectCurrentPage(s))
  const scale = useEditorStore((s) => s.camera.scale)
  const interaction = useEditorStore((s) => s.interaction)
  const showGuides = useEditorStore((s) => s.view.showGuides)
  const { start: startMove } = useMoveGuideGesture(viewportRef)

  if (!page) return null
  // Keep drawing the live drag preview even when the guides layer is
  // toggled off — otherwise pulling a guide out of the ruler gives zero
  // feedback and feels broken. Persisted guides still respect showGuides.
  const isPreviewing =
    interaction.kind === 'creating-guide' || interaction.kind === 'moving-guide'
  if (!showGuides && !isPreviewing) return null
  const { width: canvasW, height: canvasH } = page.canvas

  // Hit-area width in screen px → divided by scale so it stays the
  // same physical thickness no matter the zoom.
  const hitPx = 8 / scale
  const stroke = Math.max(1 / scale, 0.5)

  // Hide the persisted line while it's being dragged — the preview
  // takes over, otherwise we'd see a doubled line.
  const draggingId =
    interaction.kind === 'moving-guide' ? interaction.id : null

  return (
    <svg
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: canvasW,
        height: canvasH,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      {showGuides && page.guides.map((g) => {
        if (g.id === draggingId) return null
        const isV = g.orientation === 'vertical'
        return (
          <g key={g.id}>
            {/* Visible line */}
            <line
              x1={isV ? g.position : 0}
              x2={isV ? g.position : canvasW}
              y1={isV ? 0 : g.position}
              y2={isV ? canvasH : g.position}
              stroke="var(--primary)"
              strokeWidth={stroke}
              strokeOpacity={0.7}
            />
            {/* Wide invisible hit area for grabbing */}
            <line
              x1={isV ? g.position : 0}
              x2={isV ? g.position : canvasW}
              y1={isV ? 0 : g.position}
              y2={isV ? canvasH : g.position}
              stroke="transparent"
              strokeWidth={hitPx}
              style={{
                pointerEvents: 'stroke',
                cursor: isV ? 'col-resize' : 'row-resize',
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                const rect = viewportRef.current?.getBoundingClientRect()
                if (!rect) return
                startMove({
                  id: g.id,
                  orientation: g.orientation,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  viewportRect: rect,
                })
              }}
            />
          </g>
        )
      })}

      {/* Live preview — both creating-new and moving-existing share the
          same dashed style. */}
      {(interaction.kind === 'creating-guide' ||
        interaction.kind === 'moving-guide') && (
        <>
          <PreviewLine
            orientation={interaction.orientation}
            position={interaction.position}
            canvasW={canvasW}
            canvasH={canvasH}
            stroke={stroke}
            scale={scale}
          />
          {/* Coordinate readout pinned near the cursor end of the
              preview, so the user knows exactly where they're dropping
              the guide. */}
          <foreignObject
            x={
              interaction.orientation === 'vertical'
                ? interaction.position + 6 / scale
                : 6 / scale
            }
            y={
              interaction.orientation === 'horizontal'
                ? interaction.position - 18 / scale
                : 6 / scale
            }
            width={120 / scale}
            height={20 / scale}
            style={{ pointerEvents: 'none', overflow: 'visible' }}
          >
            <div
              className="bg-primary text-primary-foreground inline-block font-medium tabular-nums"
              style={{
                fontSize: 11 / scale,
                padding: `${2 / scale}px ${6 / scale}px`,
                borderRadius: 4 / scale,
                whiteSpace: 'nowrap',
              }}
            >
              {interaction.orientation === 'vertical' ? 'X' : 'Y'}:{' '}
              {Math.round(interaction.position)}
            </div>
          </foreignObject>
        </>
      )}
    </svg>
  )
}

function PreviewLine({
  orientation,
  position,
  canvasW,
  canvasH,
  stroke,
  scale,
}: {
  orientation: 'horizontal' | 'vertical'
  position: number
  canvasW: number
  canvasH: number
  stroke: number
  scale: number
}) {
  const isV = orientation === 'vertical'
  // 4 / scale → 4 screen pixels regardless of zoom, since this line is
  // drawn inside the camera-transformed layer.
  const dash = 4 / scale
  return (
    <line
      x1={isV ? position : 0}
      x2={isV ? position : canvasW}
      y1={isV ? 0 : position}
      y2={isV ? canvasH : position}
      stroke="var(--primary)"
      strokeWidth={stroke}
      strokeOpacity={0.9}
      strokeDasharray={`${dash} ${dash}`}
    />
  )
}
