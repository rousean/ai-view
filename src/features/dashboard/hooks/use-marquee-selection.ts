import { useCallback } from 'react'
import { useCanvasStore, type Element, type SelectionRect } from '../store/use-canvas-store'
import { screenToCanvas } from '../utils/canvas-coordinate'

const MARQUEE_MIN_PIXELS = 4

export function useMarqueeSelection() {
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    const viewport = e.currentTarget.parentElement
    if (!viewport) return
    const viewportRect = viewport.getBoundingClientRect()
    const camera = useCanvasStore.getState().camera
    const setSelectionRect = useCanvasStore.getState().setSelectionRect
    const start = screenToCanvas({ x: e.clientX, y: e.clientY }, viewportRect, camera)

    const move = (ev: MouseEvent) => {
      const end = screenToCanvas({ x: ev.clientX, y: ev.clientY }, viewportRect, camera)
      const x = Math.min(start.x, end.x)
      const y = Math.min(start.y, end.y)
      setSelectionRect({ x, y, width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) })
    }

    const up = (ev: MouseEvent) => {
      const state = useCanvasStore.getState()
      const selectionRect = state.runtime.selectionRect
      const didMarquee = !!(
        selectionRect && Math.max(selectionRect.width, selectionRect.height) >= MARQUEE_MIN_PIXELS
      )
      if (didMarquee) {
        const ids = pickElementsIntersectingRect(state.elements, selectionRect)
        state.setSelectedIds(ids)
      } else {
        const under = document.elementFromPoint(ev.clientX, ev.clientY)
        if (under instanceof Element && under.closest('[data-canvas-background]')) {
          state.setSelectedIds([])
        }
      }
      setSelectionRect(null)

      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [])

  return { onMouseDown }
}

function rectsIntersect(a: SelectionRect, b: SelectionRect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  )
}

function pickElementsIntersectingRect(
  elements: Record<string, Element>,
  rect: SelectionRect
): string[] {
  const ids: string[] = []
  for (const el of Object.values(elements)) {
    if (el.runtime.hidden) continue
    const { x, y, width, height } = el.props.layout
    if (rectsIntersect(rect, { x, y, width, height })) {
      ids.push(el.id)
    }
  }
  return ids
}
