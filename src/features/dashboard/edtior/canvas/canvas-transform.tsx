import { useCallback } from 'react'
import { Gridding } from './coordinate'
import { useDroppable } from '@dnd-kit/react'
import { useCanvasStore } from '../../store/use-canvas-store'
import SelectionBox from './selection-box'
import CanvasElement from './canvas-element'
import SelectionRect from './selection-rect'

export default function CanvasTransform() {
  const elements = useCanvasStore(state => state.elements)
  const width = useCanvasStore(state => state.canvas.width)
  const height = useCanvasStore(state => state.canvas.height)
  const { x, y, scale } = useCanvasStore(state => state.camera)
  const { ref } = useDroppable({ id: 'canvas' })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    console.log('rousean', e)
    const { clientX, clientY } = e
    const setSelectionRect = useCanvasStore.getState().setSelectionRect

    const move = (e: MouseEvent) => {
      const dx = (e.clientX - clientX) / scale
      const dy = (e.clientY - clientY) / scale
      setSelectionRect({ x: clientX, y: clientY, width: dx, height: dy })
    }
    
    const up = () => {
      setSelectionRect(null)
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [])

  const onClick = useCallback(() => {
    const setSelectedIds = useCanvasStore.getState().setSelectedIds
    setSelectedIds([])
  }, [])

  return (
    <div
      ref={ref}
      className="absolute inset-0 origin-top-left cursor-default"
      style={{ width, height, transform: `translate(${x}px, ${y}px) scale(${scale})` }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <Gridding width={width} height={height}></Gridding>
      {Object.values(elements).map(element => <CanvasElement key={element.id} element={element}></CanvasElement>)}
      <SelectionBox></SelectionBox>
      <SelectionRect></SelectionRect>
    </div>
  )
}
