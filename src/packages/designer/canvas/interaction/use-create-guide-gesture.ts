import * as React from 'react'
import { useDashboardEditor } from '../../editor/editor-context'
import { useEditorStore } from '../../stores/editor-store'

interface StartArgs {
  orientation: 'horizontal' | 'vertical'
  /** Initial pointer position in screen coords. */
  clientX: number
  clientY: number
  /** Rect of the canvas viewport, in screen coords. Used to convert. */
  viewportRect: DOMRect
}

/**
 * Hook for the ruler → guide drag flow.
 *
 * Returns `start(args)` — call it from the ruler's `onPointerDown`. The
 * hook then takes over the pointer: pointer-move updates the live preview
 * (via EditorStore.interaction = 'creating-guide'); pointer-up either
 * commits a new guide (when released inside the viewport) or cancels
 * (when released over the ruler).
 *
 * The preview itself is rendered by `<GuidesOverlay>` reading the same
 * interaction state.
 */
export function useCreateGuideGesture(viewportRef: React.RefObject<HTMLElement | null>) {
  const editor = useDashboardEditor()
  const stateRef = React.useRef<{
    orientation: 'horizontal' | 'vertical'
    /** Latest canvas-space position; updated on every move, read on commit. */
    position: number
  } | null>(null)

  const start = React.useCallback(
    ({ orientation, clientX, clientY, viewportRect }: StartArgs) => {
      // Compute the initial canvas-space position from the ruler click,
      // even before any pointer movement happens — so the preview shows
      // up immediately under the cursor.
      const canvas = editor.screenToCanvas(
        { x: clientX, y: clientY },
        { left: viewportRect.left, top: viewportRect.top },
      )
      const position = orientation === 'vertical' ? canvas.x : canvas.y
      stateRef.current = { orientation, position }

      useEditorStore.getState().actions.setInteraction({
        kind: 'creating-guide',
        orientation,
        position,
      })

      const onMove = (e: PointerEvent) => {
        const s = stateRef.current
        if (!s) return
        const rect = viewportRef.current?.getBoundingClientRect()
        if (!rect) return
        const c = editor.screenToCanvas(
          { x: e.clientX, y: e.clientY },
          { left: rect.left, top: rect.top },
        )
        s.position = s.orientation === 'vertical' ? c.x : c.y
        useEditorStore.getState().actions.setInteraction({
          kind: 'creating-guide',
          orientation: s.orientation,
          position: s.position,
        })
      }

      const onUp = (e: PointerEvent) => {
        const s = stateRef.current
        stateRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        useEditorStore.getState().actions.setInteraction({ kind: 'idle' })

        // Commit from the gesture's OWN captured state, not the store's
        // `interaction`: SelectTool.onPointerUp fires first (React delegates
        // at the root, which bubbles before this window listener) and resets
        // the store interaction to idle — reading it here would always look
        // like a cancel. The ref survives that.
        if (!s) return

        // Commit only if release happened over the viewport — releasing
        // back on the ruler / outside (or a `pointercancel`, where
        // clientX/Y land outside the rect) means "cancel".
        const rect = viewportRef.current?.getBoundingClientRect()
        if (!rect) return
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        if (!inside) return
        editor.addGuide(s.orientation, s.position)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      // A `pointercancel` (system gesture, touch interruption) must also
      // tear the gesture down — otherwise the move listener leaks and
      // the interaction state stays stuck on 'creating-guide'.
      window.addEventListener('pointercancel', onUp)
    },
    [editor, viewportRef],
  )

  return { start }
}
