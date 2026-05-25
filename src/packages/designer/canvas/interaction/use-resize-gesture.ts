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
      const dx = (ev.clientX - s.pointerStart.x) / scale
      const dy = (ev.clientY - s.pointerStart.y) / scale

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

      sessionRef.current = {
        handle,
        pointerStart: { x: e.clientX, y: e.clientY },
        startBBox,
        // Snapshot initial layouts; we re-derive from these every move.
        initial: initial.map((w) => structuredClone(w)),
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
