import { useCallback } from 'react'
import { Gridding } from './coordinate'
import { useDroppable } from '@dnd-kit/react'
import { screenToCanvas } from '../../utils/canvas-coordinate'
import { useCanvasStore, type Element, type SelectionRect } from '../../store/use-canvas-store'
import CanvasElement from './canvas-element'
import SelectionBounds from './selection-bounds'
import MarqueeSelection from './marquee-selection'

export default function CanvasTransform() {
  const elements = useCanvasStore(state => state.elements)
  const width = useCanvasStore(state => state.canvas.width)
  const height = useCanvasStore(state => state.canvas.height)
  const { x, y, scale } = useCanvasStore(state => state.camera)
  const { ref } = useDroppable({ id: 'canvas' })
  const { onPointerDown } = useMarqueeSelection()

  return (
    <div
      ref={ref}
      className="absolute inset-0 origin-top-left isolate cursor-default"
      style={{ width, height, transform: `translate(${x}px, ${y}px) scale(${scale})` }}
      onPointerDown={onPointerDown}
    >
      <Gridding width={width} height={height}></Gridding>
      {Object.values(elements).map(element => (
        <CanvasElement key={element.id} element={element}></CanvasElement>
      ))}
      <SelectionBounds></SelectionBounds>
      <MarqueeSelection></MarqueeSelection>
    </div>
  )
}

const MARQUEE_MIN_PIXELS = 4

export function useMarqueeSelection() {
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    const viewport = e.currentTarget.parentElement
    if (!viewport) return
    const viewportRect = viewport.getBoundingClientRect()
    const camera = useCanvasStore.getState().camera
    const setSelectionRect = useCanvasStore.getState().setSelectionRect
    const start = screenToCanvas({ x: e.clientX, y: e.clientY }, viewportRect, camera)

    const move = (ev: PointerEvent) => {
      const end = screenToCanvas({ x: ev.clientX, y: ev.clientY }, viewportRect, camera)
      const x = Math.min(start.x, end.x)
      const y = Math.min(start.y, end.y)
      setSelectionRect({ x, y, width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) })
    }

    const up = (ev: PointerEvent) => {
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

      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
    }

    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }, [])

  return { onPointerDown }
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
