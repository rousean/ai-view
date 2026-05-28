import * as React from 'react'
import type { Layout, WidgetNode } from '@schema/types'
import { useDashboardEditor } from '../../editor/editor-context'
import { buildSnapContext } from '../../snap/build-context'
import { useSnapGuidesStore } from '../../snap/snap-store'
import { useEditorStore } from '../../stores/editor-store'
import {
  type BBox,
  type ResizeHandle,
  distributeResize,
  handleSides,
  resizeBBox,
  unionBBox,
} from '../transformer/geometry'

function shouldRunSnap(): boolean {
  const v = useEditorStore.getState().view
  return v.snapToElements || v.snapToGuides || v.snapToGrid
}

interface ResizeSession {
  handle: ResizeHandle
  pointerStart: { x: number; y: number }
  startBBox: BBox
  initial: WidgetNode[]
  /**
   * Set only when the selection is a single rotated widget. Triggers
   * the rotation-aware code path in `onMove`. For all other cases
   * (axis-aligned single, or multi-select) it stays undefined and the
   * legacy distribute-by-AABB algorithm runs.
   */
  rotated?: {
    /** widget.layout.rotate, degrees. */
    angle: number
    /** Anchor's screen-space position at gesture start — held fixed. */
    screenAnchor: { x: number; y: number }
    /** Starting layout snapshot (unrotated frame). */
    startLayout: Layout
  }
}

/**
 * The "anchor" (opposite corner / edge) of a resize handle, expressed
 * in the widget's local frame relative to its centre.
 *
 *   bottom-right handle → top-left anchor (-w/2, -h/2)
 *   right handle        → left edge        (-w/2,    0)
 *   top handle          → bottom edge      (   0, +h/2)
 *   etc.
 *
 * Used by the rotation-aware resize to keep the visually-fixed corner
 * (the one the user did not grab) glued to the screen while the
 * grabbed corner follows the pointer.
 */
function localAnchorOffset(handle: ResizeHandle, w: number, h: number) {
  const sides = handleSides(handle)
  const x = sides.movesLeft ? w / 2 : sides.movesRight ? -w / 2 : 0
  const y = sides.movesTop ? h / 2 : sides.movesBottom ? -h / 2 : 0
  return { x, y }
}

/**
 * Hook returning a `start(handle, pointerEvent)` function that begins a
 * resize gesture on the current selection. The gesture handles
 * pointer move / up internally and commits via editor.updateLayoutBatch.
 *
 * Shift = lock aspect ratio. Alt = scale from center.
 */
export function useResizeGesture(): (handle: ResizeHandle, e: React.PointerEvent) => void {
  const editor = useDashboardEditor()
  const sessionRef = React.useRef<ResizeSession | null>(null)

  const onMove = React.useCallback(
    (ev: PointerEvent) => {
      const s = sessionRef.current
      if (!s) return
      const scale = editor.getCamera().scale
      const screenDx = (ev.clientX - s.pointerStart.x) / scale
      const screenDy = (ev.clientY - s.pointerStart.y) / scale

      // Rotation-aware single-widget path. The legacy distribute-by-AABB
      // algorithm doesn't work here: it treats the widget's rotated AABB
      // as the start box and applies screen-space deltas, which produces
      // uniform scaling along widget-local axes (so dragging the "right"
      // edge inflates both width and height, and the anchor corner walks
      // off across the canvas).
      //
      // The fix:
      //   1. Rotate the pointer delta into the widget's local frame.
      //   2. Run resizeBBox in the local frame against the *unrotated*
      //      layout — same logic axis-aligned widgets use.
      //   3. Translate the new layout so the anchor corner (the one the
      //      user did NOT grab) stays at its original screen position.
      if (s.rotated) {
        const { angle, screenAnchor, startLayout } = s.rotated
        const rad = (angle * Math.PI) / 180
        const cosA = Math.cos(rad)
        const sinA = Math.sin(rad)
        // Inverse-rotate the pointer delta into widget-local coords.
        const localDx = screenDx * cosA + screenDy * sinA
        const localDy = -screenDx * sinA + screenDy * cosA

        // Resize the unrotated layout in the local frame.
        const newLocalBBox = resizeBBox(
          { x: 0, y: 0, width: startLayout.width, height: startLayout.height },
          s.handle,
          localDx,
          localDy,
          { lockAspect: ev.shiftKey, fromCenter: ev.altKey },
        )

        // Anchor offset re-derived against the *new* size so the side
        // length that didn't move (in local frame) stays anchored to
        // the same screen point.
        const anchorLocal = localAnchorOffset(s.handle, newLocalBBox.width, newLocalBBox.height)
        // newCenter such that:  screenAnchor === newCenter + R(angle) * anchorLocal
        const newCenter = {
          x: screenAnchor.x - (anchorLocal.x * cosA - anchorLocal.y * sinA),
          y: screenAnchor.y - (anchorLocal.x * sinA + anchorLocal.y * cosA),
        }

        editor.updateLayout(s.initial[0]!.id, {
          x: newCenter.x - newLocalBBox.width / 2,
          y: newCenter.y - newLocalBBox.height / 2,
          width: newLocalBBox.width,
          height: newLocalBBox.height,
        })
        useSnapGuidesStore.getState().clear()
        return
      }

      const dx = screenDx
      const dy = screenDy
      const newBBox = resizeBBox(s.startBBox, s.handle, dx, dy, {
        lockAspect: ev.shiftKey,
        fromCenter: ev.altKey,
      })

      // ── Snap the moving edges ────────────────────────────────────
      const sides = handleSides(s.handle)
      let snapped = newBBox
      if (!ev.altKey && editor.snap && shouldRunSnap()) {
        try {
          const view = useEditorStore.getState().view
          editor.snap.configure({
            toElements: view.snapToElements,
            toGuides: view.snapToGuides,
            toCanvas: view.snapToElements,
            toGrid: view.snapToGrid,
          })
          const ctx = buildSnapContext(
            editor,
            s.initial.map((w) => w.id),
          )
          const result = editor.snap.snap(
            newBBox,
            {
              left: sides.movesLeft,
              right: sides.movesRight,
              top: sides.movesTop,
              bottom: sides.movesBottom,
            },
            ctx,
            scale,
          )
          // Apply snap delta only to the side that's actually moving so
          // the anchored side stays put.
          snapped = { ...newBBox }
          if (result.delta.x !== 0) {
            if (sides.movesLeft) {
              snapped.x += result.delta.x
              snapped.width -= result.delta.x
            } else if (sides.movesRight) {
              snapped.width += result.delta.x
            }
          }
          if (result.delta.y !== 0) {
            if (sides.movesTop) {
              snapped.y += result.delta.y
              snapped.height -= result.delta.y
            } else if (sides.movesBottom) {
              snapped.height += result.delta.y
            }
          }
          useSnapGuidesStore.getState().set(result.guides)
        } catch (err) {
          console.warn('[snap] resize snap failed', err)
          useSnapGuidesStore.getState().clear()
        }
      } else {
        useSnapGuidesStore.getState().clear()
      }

      const updates = distributeResize(s.initial, s.startBBox, snapped)
      editor.updateLayoutBatch(updates as Array<{ id: string; layout: Partial<Layout> }>)
    },
    [editor],
  )

  const onUp = React.useCallback(() => {
    sessionRef.current = null
    useSnapGuidesStore.getState().clear()
    useEditorStore.getState().actions.setInteraction({ kind: 'idle' })
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }, [onMove])

  return React.useCallback(
    (handle: ResizeHandle, e: React.PointerEvent) => {
      const initial = editor.getSelectedWidgets()
      if (initial.length === 0) return
      const startBBox = unionBBox(initial)
      if (!startBBox) return

      // Detect the rotation-aware single-widget case.
      // Multi-select with mixed rotations is still handled by the AABB
      // algorithm — it's not perfect, but matches the chrome behaviour
      // (the multi-select chrome itself is axis-aligned at resize time)
      // and we'd rather under-promise than ship a buggy half-fix.
      const single = initial.length === 1 ? initial[0] : null
      const rotated =
        single && single.layout.rotate
          ? (() => {
              const layout = single.layout
              const cx = layout.x + layout.width / 2
              const cy = layout.y + layout.height / 2
              const off = localAnchorOffset(handle, layout.width, layout.height)
              const r = (layout.rotate * Math.PI) / 180
              const cosA = Math.cos(r)
              const sinA = Math.sin(r)
              return {
                angle: layout.rotate,
                startLayout: { ...layout },
                screenAnchor: {
                  x: cx + (off.x * cosA - off.y * sinA),
                  y: cy + (off.x * sinA + off.y * cosA),
                },
              }
            })()
          : undefined

      sessionRef.current = {
        handle,
        pointerStart: { x: e.clientX, y: e.clientY },
        startBBox,
        // Snapshot initial layouts; we re-derive from these every move.
        initial: initial.map((w) => structuredClone(w)),
        rotated,
      }
      // Surface the gesture to EditorStore so HUD overlays can render
      // the right readout (W × H during resize).
      useEditorStore.getState().actions.setInteraction({
        kind: 'resizing',
        ids: initial.map((w) => w.id),
        handle,
      })
      // Mark a single history breakpoint at gesture start; subsequent
      // updateLayoutBatch calls coalesce via mergeKey.
      editor.mark('Resize widgets')

      // stop bubbling so SelectTool doesn't see this.
      e.stopPropagation()
      e.preventDefault()
      ;(e.target as Element).setPointerCapture?.(e.pointerId)

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [editor, onMove, onUp],
  )
}
