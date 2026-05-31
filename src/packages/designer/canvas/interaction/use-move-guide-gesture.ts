import * as React from 'react'
import { useDashboardEditor } from '../../editor/editor-context'
import { useEditorStore } from '../../stores/editor-store'

interface StartArgs {
  id: string
  orientation: 'horizontal' | 'vertical'
  /** Initial pointer position in screen coords. */
  clientX: number
  clientY: number
  /** Rect of the canvas viewport. */
  viewportRect: DOMRect
}

/**
 * Hook for dragging an existing guide.
 *
 *   - pointer-move updates `guide.position` via `widget.updateLayoutBatch`-
 *     style merged commands (HistoryManager folds the burst into one undo).
 *   - pointer-up commits the final position; releasing OFF the viewport
 *     (i.e. dragging the guide back onto the ruler) deletes it instead.
 */
export function useMoveGuideGesture(viewportRef: React.RefObject<HTMLElement | null>) {
  const editor = useDashboardEditor()

  const start = React.useCallback(
    ({ id, orientation, clientX, clientY, viewportRect }: StartArgs) => {
      // Seed an initial position so the preview tracks even before the
      // first pointermove arrives.
      const initial = editor.screenToCanvas(
        { x: clientX, y: clientY },
        { left: viewportRect.left, top: viewportRect.top },
      )
      const initialPos = orientation === 'vertical' ? initial.x : initial.y
      useEditorStore.getState().actions.setInteraction({
        kind: 'moving-guide',
        id,
        orientation,
        position: initialPos,
      })

      const onMove = (e: PointerEvent) => {
        const rect = viewportRef.current?.getBoundingClientRect()
        if (!rect) return
        const c = editor.screenToCanvas(
          { x: e.clientX, y: e.clientY },
          { left: rect.left, top: rect.top },
        )
        const pos = orientation === 'vertical' ? c.x : c.y
        useEditorStore.getState().actions.setInteraction({
          kind: 'moving-guide',
          id,
          orientation,
          position: pos,
        })
        // Commit each move through the mergeable command so undo collapses
        // the entire drag into one entry.
        editor.updateGuide(id, pos)
      }

      const teardown = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        useEditorStore.getState().actions.setInteraction({ kind: 'idle' })
      }

      const onUp = (e: PointerEvent) => {
        teardown()
        const rect = viewportRef.current?.getBoundingClientRect()
        if (!rect) return
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        if (!inside) {
          // Dropped back over the ruler → delete it (Figma idiom).
          editor.removeGuide(id)
        }
      }

      // pointercancel (system gesture / touch interruption) must NOT
      // route through onUp — its coordinates are unreliable and would
      // land "outside" the viewport, wrongly deleting the guide the user
      // was merely moving. Cancel = leave the guide at its last
      // committed position and just tear the listeners down.
      const onCancel = () => {
        teardown()
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
    },
    [editor, viewportRef],
  )

  return { start }
}
