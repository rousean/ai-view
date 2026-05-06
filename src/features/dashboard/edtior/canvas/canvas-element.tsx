import { useCallback } from 'react'
import { getComponent } from '~/features/component-library/registry'
import { useCanvasStore, type Element } from '../../store/use-canvas-store'

export function zWidget(layoutZ: number) {
  return Math.min(Math.max(layoutZ ?? 0, 0), 98)
}

export default function CanvasElement({ element }: { element: Element }) {
  const Component = getComponent(element.type)
  if (!Component) return null

  const { x, y, zIndex, rotate } = element.props.layout
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds)
  const pushHistorySnapshot = useCanvasStore(state => state.pushHistorySnapshot)
  const translateElementsFromLayouts = useCanvasStore(state => state.translateElementsFromLayouts)

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    const { runtime } = useCanvasStore.getState()
    const alreadyInSelection = runtime.selectedIds.includes(element.id)

    if (!alreadyInSelection) {
      setSelectedIds([element.id])
    }

    const startX = e.clientX
    const startY = e.clientY
    let dragStarted = false
    let snapshot: Record<string, (typeof element.props.layout)> | null = null

    const beginDragIfNeeded = () => {
      if (dragStarted) return true
      const selectedIds = useCanvasStore.getState().runtime.selectedIds
      const idsToMove = selectedIds.filter(id => {
        const el = useCanvasStore.getState().elements[id]
        return el && !el.runtime.locked
      })
      if (idsToMove.length === 0) return false
      snapshot = {}
      const els = useCanvasStore.getState().elements
      for (const id of idsToMove) {
        const el = els[id]
        if (el) snapshot[id] = { ...el.props.layout }
      }
      pushHistorySnapshot()
      dragStarted = true
      return true
    }

    const move = (event: MouseEvent) => {
      const dist = Math.hypot(event.clientX - startX, event.clientY - startY)
      if (!dragStarted) {
        if (dist < 5) return
        if (!beginDragIfNeeded()) return
      }
      if (!snapshot) return
      const { camera } = useCanvasStore.getState()
      const dx = (event.clientX - startX) / camera.scale
      const dy = (event.clientY - startY) / camera.scale
      translateElementsFromLayouts(snapshot, dx, dy)
    }

    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      if (!dragStarted && alreadyInSelection) {
        setSelectedIds([element.id])
      }
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [element.id, setSelectedIds, pushHistorySnapshot, translateElementsFromLayouts])

  return (
    <div
      className="absolute origin-top-left cursor-pointer pointer-events-auto"
      style={{
        zIndex: zWidget(zIndex),
        transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
      }}
      onMouseDown={onMouseDown}
    >
      <Component props={element.props} data={element.data}></Component>
    </div>
  )
}