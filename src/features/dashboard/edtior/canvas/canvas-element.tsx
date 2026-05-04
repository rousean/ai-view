import { useCallback } from 'react'
import { getComponent } from '~/features/component-library/registry'
import { useCanvasStore, type Element } from '../../store/use-canvas-store'
import { cn } from '~/lib/utils'

export default function CanvasElement({ element, className }: { element: Element, className?: string }) {
  const Component = getComponent(element.type)
  if (!Component) return null

  const { x, y, zIndex, rotate } = element.props.layout
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds)
  const updateElement = useCanvasStore(state => state.updateElement)


  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    setSelectedIds([element.id])

    if (element.runtime.locked) return

    const startX = e.clientX
    const startY = e.clientY
    const { camera, canvas, elements } = useCanvasStore.getState()
    const current = elements[element.id]
    if (!current) return

    const startLayout = { ...current.props.layout }
    const move = (event: MouseEvent) => {
      const dx = (event.clientX - startX) / camera.scale
      const dy = (event.clientY - startY) / camera.scale
      const latest = useCanvasStore.getState().elements[element.id]
      if (!latest) return

      updateElement(element.id, {
        props: {
          ...latest.props,
          layout: {
            ...latest.props.layout,
            x: Math.min(Math.max(0, Math.round(startLayout.x + dx)), canvas.width - startLayout.width),
            y: Math.min(Math.max(0, Math.round(startLayout.y + dy)), canvas.height - startLayout.height),
          }
        }
      })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [element.id, element.runtime.locked, setSelectedIds, updateElement])

  return (
    <div
      className={cn('absolute origin-top-left cursor-pointer pointer-events-auto', className)}
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