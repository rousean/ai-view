import { useRef } from 'react'
import { useCanvasStore } from '../store/use-canvas-store'
import type { Meta } from '~/features/component-library/type'
import { DragDropProvider, DragStartEvent, type DragEndEvent } from '@dnd-kit/react'
import Materials from './materials/materials'
import Property from './component/property'
import Toolbar from './component/toolbar'
import Canvas from './canvas/canvas'

export default function Editor() {
  const offset = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleDragStart = (event: DragStartEvent) => {
    const { source, position } = event.operation
    if (!source?.element) return
    const { left, top } = source.element.getBoundingClientRect()
    offset.current.x = position.current.x - left
    offset.current.y = position.current.y - top
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { source, target, position } = event.operation
    if (!source?.element || !target?.element) return
    if (source.type === 'materials' && target.id === 'canvas') {
      const scale = useCanvasStore.getState().camera.scale
      const width = useCanvasStore.getState().canvas.width
      const height = useCanvasStore.getState().canvas.height
      const addElement = useCanvasStore.getState().addElement
      const { left, top } = target.element.getBoundingClientRect()
      const x = (position.current.x - left - offset.current.x) / scale
      const y = (position.current.y - top - offset.current.y) / scale
      addElement(source.data as Meta, {
        x: Math.min(Math.max(0, Math.round(x)), width - source.data.props.layout.width),
        y: Math.min(Math.max(0, Math.round(y)), height - source.data.props.layout.height)
      })
    }
  }

  return (
    <div className="flex flex-col gap-2 w-screen h-screen p-1 bg-accent">
      <Toolbar></Toolbar>
      <div className="flex flex-1 min-h-0 min-w-0 gap-2 w-full">
        <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Materials></Materials>
          <Canvas className="flex-1"></Canvas>
        </DragDropProvider>
        <Property></Property>
      </div>
    </div>
  )
}
