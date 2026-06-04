import * as React from 'react'
import { Lock } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import type { WidgetMeta } from '@widgets/widget-meta'
import { useDashboardEditor } from '../../editor/editor-context'
import { useDocumentStore } from '../../stores/document-store'
import { useEditorStore } from '../../stores/editor-store'
import { selectWidget, selectWidgets } from '../../stores/selectors'
import { unionBBox } from '../transformer/geometry'
import { ResizeHandles } from './resize-handles'
import { RotationHandle } from './rotation-handle'

interface SelectionBBox {
  x: number
  y: number
  width: number
  height: number
  /**
   * Chrome rotation in degrees CW.
   *   - count === 1: tracks the single widget's own `layout.rotate`
   *   - count > 1, mid-rotation: the live gesture delta, so the multi-
   *     select chrome rotates rigidly around the pivot instead of
   *     re-deriving from each frame's AABB (which would wobble and
   *     drift off-pivot for asymmetric selections)
   *   - count > 1, idle: 0 (axis-aligned AABB)
   */
  rotate: number
  /** Single-element flip; multi-selection chrome is never flipped. */
  flipX: boolean
  flipY: boolean
  count: number
  /**
   * True when *every* widget in the current selection is locked. In
   * that case we render a dashed outline + lock icon and suppress the
   * resize / rotation handles — interacting with them would silently
   * fail since the underlying gestures filter locked widgets out.
   */
  allLocked: boolean
  /**
   * The single selected widget's `type`, so the chrome can look up its
   * `capabilities`. Undefined for multi-selection.
   */
  widgetType?: string
}

/**
 * Compute the bbox to draw the selection chrome at.
 *
 * Single selection: the chrome rotates with the widget (`transform: rotate`
 * applied at render). So we return the *un-rotated* layout rect plus the
 * widget's rotation — the CSS transform will orient the chrome correctly.
 *
 * Multi-selection, idle/moving/resizing: the chrome stays axis-aligned and
 * encloses every selected widget's *visual* extent (rotatedAABB).
 *
 * Multi-selection, **rotating**: the chrome is frozen to the initial AABB
 * captured at gesture start, then rotated rigidly by the live `delta`
 * around the pivot. This avoids two distinct artefacts:
 *
 *   1. **Wobble** — each member's rotatedAABB grows/shrinks as it spins,
 *      so a per-frame `unionBBox` is constantly resizing.
 *   2. **Pivot drift** — for selections of mixed sizes, the per-frame
 *      union AABB centre walks away from the original pivot, leaving the
 *      rotation handle disconnected from where the user is dragging.
 *
 * Locking to the initial bbox keeps the handle anchored to the actual
 * pivot for the whole gesture.
 */
function useSelectionBBox(): SelectionBBox | null {
  const ids = useEditorStore(useShallow((s) => s.selectedIds))
  const interaction = useEditorStore((s) => s.interaction)
  const widgets = useDocumentStore(
    useShallow((s) => {
      if (ids.length === 0) return []
      if (ids.length === 1) {
        const w = selectWidget(ids[0])(s)
        return w ? [w] : []
      }
      const all = selectWidgets(s)
      const set = new Set(ids)
      return all.filter((w) => set.has(w.id))
    }),
  )
  if (widgets.length === 0) return null

  const allLocked = widgets.every((w) => w.flags.locked)

  if (widgets.length === 1) {
    const w = widgets[0]
    return {
      x: w.layout.x,
      y: w.layout.y,
      width: w.layout.width,
      height: w.layout.height,
      rotate: w.layout.rotate,
      flipX: w.layout.flipX,
      flipY: w.layout.flipY,
      count: 1,
      allLocked,
      widgetType: w.type,
    }
  }

  // Multi-select, mid-rotation: freeze to the gesture's initial AABB and
  // rotate by `delta`. SelectionBounds will set transformOrigin to the
  // bbox centre, which (because `pivot = bboxCenter(initialBBox)`) is
  // exactly the rotation pivot — the chrome spins around the same point
  // the widgets do.
  if (interaction.kind === 'rotating' && widgets.length > 1) {
    const { initialBBox: ib, delta } = interaction
    return {
      x: ib.x,
      y: ib.y,
      width: ib.width,
      height: ib.height,
      rotate: delta,
      flipX: false,
      flipY: false,
      count: widgets.length,
      allLocked,
    }
  }

  const bb = unionBBox(widgets)
  if (!bb) return null
  return {
    ...bb,
    rotate: 0,
    flipX: false,
    flipY: false,
    count: widgets.length,
    allLocked,
  }
}

/**
 * Selection chrome: outline + 8 resize handles + 1 rotation handle.
 *
 * For multi-selection, the bbox is the AABB and rotation is shown as 0;
 * the rotation gesture rotates each member around the group center.
 *
 * The chrome itself is rendered inside the camera-transformed layer, so
 * stroke widths are counter-scaled to stay 1px on screen.
 */
export const SelectionBounds: React.FC = () => {
  const editor = useDashboardEditor()
  const bbox = useSelectionBBox()
  const scale = useEditorStore((s) => s.camera.scale)
  const interaction = useEditorStore((s) => s.interaction.kind)
  if (!bbox) return null

  // Single-selection chrome honours the widget's capabilities: hide the
  // rotation handle when `rotatable === false`, drop resize handles when
  // `resizable === false`, and pass the axis constraint to ResizeHandles.
  // Multi-selection always shows the full chrome (mixed caps don't unify).
  const caps =
    bbox.count === 1 && bbox.widgetType
      ? (editor.registry.widgets.get(bbox.widgetType) as WidgetMeta | undefined)?.capabilities
      : undefined
  const resizable = caps?.resizable ?? true
  const rotatable = caps?.rotatable ?? true

  const stroke = Math.max(1 / scale, 0.5)
  const isMarquee = interaction === 'marquee'
  const showBadge =
    interaction === 'idle' ||
    interaction === 'moving' ||
    interaction === 'resizing' ||
    interaction === 'rotating'

  // Apply the chrome's rotation/flip transform:
  //   - count === 1: mirrors the widget's full transform (rotate + flip)
  //     so the chrome visually overlays the rotated/flipped widget.
  //   - count > 1: only `rotate` is ever non-zero (set by useSelectionBBox
  //     during a rotation gesture); flips don't apply to multi-select
  //     chrome. Transform origin defaults to centre, which IS the rotation
  //     pivot (pivot == bboxCenter(initialBBox)) — so the chrome spins
  //     around the same point as the widgets.
  const chromeTransform =
    bbox.rotate || bbox.flipX || bbox.flipY
      ? `rotate(${bbox.rotate}deg) scale(${bbox.flipX ? -1 : 1}, ${bbox.flipY ? -1 : 1})`
      : undefined

  return (
    <>
      <div
        className="pointer-events-none absolute origin-center"
        data-skip-snapshot
        style={{
          left: bbox.x,
          top: bbox.y,
          width: bbox.width,
          height: bbox.height,
          transform: chromeTransform,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            // Dashed outline when the selection is locked — same colour
            // (primary) so it still reads as "this is selected", but the
            // pattern reinforces "you can't move/resize it".
            outline: bbox.allLocked
              ? `${stroke}px dashed var(--primary)`
              : `${stroke}px solid var(--primary)`,
            outlineOffset: `-${stroke}px`,
          }}
        />
        {!isMarquee && !bbox.allLocked && (
          <>
            {rotatable && (
              <RotationHandle
                bbox={{ x: 0, y: 0, width: bbox.width, height: bbox.height }}
                rotation={bbox.count === 1 ? bbox.rotate : 0}
              />
            )}
            {resizable !== false && (
              <ResizeHandles
                bbox={{ x: 0, y: 0, width: bbox.width, height: bbox.height }}
                rotation={bbox.count === 1 ? bbox.rotate : 0}
                resizable={resizable}
              />
            )}
          </>
        )}
        {bbox.allLocked && <LockBadge bbox={bbox} scale={scale} />}
      </div>
      {/* Size / coord readout — rendered OUTSIDE the rotated chrome so it
          stays at the selection's visual bottom-centre and horizontal,
          instead of orbiting to the side as the selection rotates. */}
      {showBadge && <SizeBadge bbox={bbox} interaction={interaction} scale={scale} />}
    </>
  )
}

/**
 * Floating numeric tag pinned to the bottom-centre of the selection
 * bbox. Content depends on what gesture is in flight:
 *
 *   - idle:      `W × H` — the standing size readout
 *   - moving:    `X, Y`  — current top-left in canvas coords
 *   - resizing:  `W × H` — live size as the user drags a handle
 *   - rotating:  `N°`    — current angle
 *
 * Lives inside the chrome's rotated transform, but counter-scales font
 * + padding so it always reads as 11px on screen regardless of zoom.
 */
function LockBadge({
  bbox,
  scale,
}: {
  bbox: SelectionBBox
  scale: number
}) {
  const size = 14 / scale
  const counterRotate = bbox.rotate ? `rotate(${-bbox.rotate}deg)` : ''
  return (
    <div
      className="bg-primary text-primary-foreground pointer-events-none absolute flex items-center justify-center rounded-full shadow-sm"
      style={{
        width: size,
        height: size,
        left: -size / 2,
        top: -size / 2,
        transform: counterRotate,
        transformOrigin: 'center',
      }}
      aria-label="已锁定"
    >
      <Lock size={Math.max(8, 9 / scale)} strokeWidth={2.5} />
    </div>
  )
}

function SizeBadge({
  bbox,
  interaction,
  scale,
}: {
  bbox: SelectionBBox
  interaction: ReturnType<typeof useEditorStore.getState>['interaction']['kind']
  scale: number
}) {
  let text: string
  if (interaction === 'moving') {
    text = `${Math.round(bbox.x)}, ${Math.round(bbox.y)}`
  } else if (interaction === 'rotating') {
    text = `${Math.round(bbox.rotate)}°`
  } else {
    // idle / resizing — both show the current size
    text = `${Math.round(bbox.width)} × ${Math.round(bbox.height)}`
  }
  // Pin to the selection's *visual* bottom-centre in canvas space. The
  // badge is rendered outside the chrome's rotate transform, so we offset
  // down by half the rotated AABB height — this clears the spinning box and
  // keeps the readout horizontal and below the selection at any angle
  // (instead of orbiting to the side with the old in-chrome anchor).
  const rad = (bbox.rotate * Math.PI) / 180
  const rotH = Math.abs(bbox.width * Math.sin(rad)) + Math.abs(bbox.height * Math.cos(rad))
  const cx = bbox.x + bbox.width / 2
  const cy = bbox.y + bbox.height / 2
  return (
    <div
      className="bg-primary text-primary-foreground pointer-events-none absolute font-medium whitespace-nowrap tabular-nums"
      style={{
        left: cx,
        top: cy + rotH / 2 + 8 / scale,
        transform: 'translate(-50%, 0)',
        transformOrigin: 'top center',
        fontSize: 11 / scale,
        padding: `${2 / scale}px ${6 / scale}px`,
        borderRadius: 4 / scale,
        boxShadow: `0 ${1 / scale}px ${3 / scale}px rgba(0,0,0,0.2)`,
      }}
    >
      {text}
    </div>
  )
}
