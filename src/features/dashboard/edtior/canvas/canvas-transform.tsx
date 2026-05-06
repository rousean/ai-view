import { useCallback } from 'react'
import { Gridding } from './coordinate'
import { useDroppable } from '@dnd-kit/react'
import { useCanvasStore } from '../../store/use-canvas-store'
import SelectionBox from './selection-box'
import CanvasElement from './canvas-element'

export default function Canvas() {
  const { width, height } = useCanvasStore(state => state.canvas)
  const { x, y, scale } = useCanvasStore(state => state.camera)
  const elements = useCanvasStore(state => state.elements)
  const { ref: droppableRef } = useDroppable({ id: 'canvas' })
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds)
  const onClick = useCallback(() => {
    setSelectedIds([])
  }, [setSelectedIds])

  return (
    <div
      ref={droppableRef}
      className="absolute inset-0 origin-top-left cursor-default"
      style={{ width, height, transform: `translate(${x}px, ${y}px) scale(${scale})` }}
      onMouseDown={e => e.stopPropagation()}
      onClick={onClick}
    >
      <Gridding width={width} height={height}></Gridding>
      {Object.values(elements).map(element => <CanvasElement key={element.id} element={element}></CanvasElement>)}
      <SelectionBox></SelectionBox>
    </div>
  )
}
