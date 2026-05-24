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
  } | null>(null)

  const start = React.useCallback(
    ({ orientation, clientX, clientY, viewportRect }: StartArgs) => {
      stateRef.current = { orientation }

      // Compute the initial canvas-space position from the ruler click,
      // even before any pointer movement happens — so the preview shows
      // up immediately under the cursor.
      const canvas = editor.screenToCanvas(
        { x: clientX, y: clientY },
        { left: viewportRect.left, top: viewportRect.top },
      )
      const position = orientation === 'vertical' ? canvas.x : canvas.y

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
        useEditorStore.getState().actions.setInteraction({
          kind: 'creating-guide',
          orientation: s.orientation,
          position: s.orientation === 'vertical' ? c.x : c.y,
        })
      }

      const onUp = (e: PointerEvent) => {
        const s = stateRef.current
        const interaction = useEditorStore.getState().interaction
        stateRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        useEditorStore.getState().actions.setInteraction({ kind: 'idle' })

        if (!s || interaction.kind !== 'creating-guide') return

        // Commit only if release happened over the viewport — releasing
        // back on the ruler / outside means "cancel".
        const rect = viewportRef.current?.getBoundingClientRect()
        if (!rect) return
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        if (!inside) return
        editor.addGuide(s.orientation, interaction.position)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [editor, viewportRef],
  )

  return { start }
}
