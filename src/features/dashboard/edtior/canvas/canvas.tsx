import { cn } from '~/lib/utils'
import { useDroppable } from '@dnd-kit/react'
import { AxisX, AxisY, Gridding } from './coordinate'
import { useCanvasStore } from '../../store/use-canvas-store'
import { useRef, useEffect, useState, useCallback, RefObject } from 'react'
import SelectionBox from './selection-box'
import CanvasElement from './canvas-element'

export default function Canvas({ className }: { className?: string }) {
  const { width, height } = useCanvasStore(state => state.canvas)
  const camera = useCanvasStore(state => state.camera)
  const elements = useCanvasStore(state => state.elements)
  const setCamera = useCanvasStore(state => state.setCamera)
  const { ref: droppableRef } = useDroppable({ id: 'canvas' })
  const { onMouseDown } = useCanvasCamera(setCamera)
  const viewportRef = useRef<HTMLDivElement>(null)
  const viewportSize = useViewportSize(viewportRef)
  const onWheelZoom = useCallback((e: React.WheelEvent) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) e.preventDefault()
    const zoom = e.deltaY > 0 ? 0.9 : 1.1
    const nextScale = camera.scale * zoom
    setCamera({ scale: Math.min(10, Math.max(0.2, nextScale)) })
  }, [setCamera, camera.scale])
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds)
  const onClick = useCallback(() => {
    setSelectedIds([])
  }, [setSelectedIds])

  return (
    <div className={cn("grid grid-cols-[20px_1fr] grid-rows-[20px_1fr] border border-gray-200 rounded-md bg-white overflow-hidden text-blue-500", className)}>
      <div className="w-5"></div>
      <AxisX width={viewportSize.width} camera={camera}></AxisX>
      <AxisY height={viewportSize.height} camera={camera}></AxisY>
      <div ref={viewportRef} className="flex-1 relative overflow-hidden cursor-move" onMouseDown={onMouseDown} onWheel={onWheelZoom}>
        <div
          ref={droppableRef}
          className="absolute inset-0 origin-top-left cursor-default"
          style={{ width, height, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}
          onMouseDown={e => e.stopPropagation()}
          onClick={onClick}
        >
          <Gridding width={width} height={height}></Gridding>
          {Object.values(elements).map(element => <CanvasElement key={element.id} element={element}></CanvasElement>)}
          <SelectionBox></SelectionBox>
        </div>
      </div>
    </div>
  )
}


function useViewportSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return size
}

function useCanvasCamera(setCamera: (camera: { x: number, y: number, scale: number }) => void) {
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const { clientX, clientY } = e
    const { x, y, scale } = useCanvasStore.getState().camera
    const move = (e: MouseEvent) => {
      const dx = e.clientX - clientX
      const dy = e.clientY - clientY
      setCamera({ x: x + dx,  y: y + dy, scale })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [setCamera])
  return { onMouseDown }
}
