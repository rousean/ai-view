import { useCallback } from 'react'
import { getComponent } from '~/features/component-library/registry'
import { useCanvasStore, type Element } from '../../store/use-canvas-store'

export default function CanvasElement({ element }: { element: Element }) {
  const Component = getComponent(element.type)
  if (!Component) return null

  const { x, y, zIndex, rotate } = element.props.layout
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds)
  const updateElement = useCanvasStore(state => state.updateElement)
  const pushHistorySnapshot = useCanvasStore(state => state.pushHistorySnapshot)

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    setSelectedIds([element.id])

    const startX = e.clientX
    const startY = e.clientY
    const { elements } = useCanvasStore.getState()
    const current = elements[element.id]
    if (!current) return

    const startLayout = { ...current.props.layout }
    const baseProps = {
      ...current.props,
      layout: { ...current.props.layout },
    }

    pushHistorySnapshot()

    const move = (event: MouseEvent) => {
      const { camera, canvas } = useCanvasStore.getState()
      const dx = (event.clientX - startX) / camera.scale
      const dy = (event.clientY - startY) / camera.scale
      const nextX = Math.min(
        Math.max(0, Math.round(startLayout.x + dx)),
        canvas.width - startLayout.width
      )
      const nextY = Math.min(
        Math.max(0, Math.round(startLayout.y + dy)),
        canvas.height - startLayout.height
      )

      updateElement(
        element.id,
        {
          props: {
            ...baseProps,
            layout: {
              ...startLayout,
              x: nextX,
              y: nextY,
            },
          },
        },
        { history: false }
      )
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [element.id, setSelectedIds, updateElement, pushHistorySnapshot])

  return (
    <div
      className="absolute origin-top-left cursor-pointer pointer-events-auto"
      style={{
        zIndex,
        transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
      }}
      onMouseDown={onMouseDown}
      onClick={e => e.stopPropagation()}
    >
      <Component props={element.props} data={element.data}></Component>
    </div>
  )
}