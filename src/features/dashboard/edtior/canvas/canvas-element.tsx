import { useCallback } from 'react'
import { useCanvasStore, type Element } from '../../store/use-canvas-store'
import { getComponent } from '~/features/component-library/registry'

export default function CanvasElement({ element }: { element: Element }) {
  const Component = getComponent(element.type)
  if (!Component) return null

  const { x, y, zIndex, rotate } = element.props.layout
  const { onPointerDown } = useElementDrag(element.id) 

  return (
    <div
      className="absolute origin-top-left cursor-pointer pointer-events-auto"
      style={{
        zIndex,
        transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
      }}
      onPointerDown={onPointerDown}
    >
      <Component props={element.props} data={element.data}></Component>
    </div>
  )
}

export function useElementDrag(elementId: string) {
  const pushHistorySnapshot = useCanvasStore(state => state.pushHistorySnapshot)
  const translateElementsFromLayouts = useCanvasStore(state => state.translateElementsFromLayouts)
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    const alreadySelected = useCanvasStore.getState().runtime.selectedIds.includes(elementId)

    if (!alreadySelected) {
      setSelectedIds([elementId])
    }

    pushHistorySnapshot()

    const startX = e.clientX
    const startY = e.clientY

    const move = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY)
      if (dist < 5) return

      const { camera } = useCanvasStore.getState()
      const dx = (ev.clientX - startX) / camera.scale
      const dy = (ev.clientY - startY) / camera.scale

      const snapshot = { [elementId]: useCanvasStore.getState().elements[elementId]?.props.layout }
      if (snapshot[elementId]) {
        translateElementsFromLayouts(snapshot, dx, dy)
      }
    }

    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
    }

    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }, [elementId, pushHistorySnapshot, translateElementsFromLayouts, setSelectedIds])

  return { onPointerDown }
}
