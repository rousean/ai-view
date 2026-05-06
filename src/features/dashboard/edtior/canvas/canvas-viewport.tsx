import { useCanvasStore } from '../../store/use-canvas-store'
import { useCallback, RefObject } from 'react'

export default function CanvasViewport ({ ref, children }: { ref: RefObject<HTMLDivElement>, children: React.ReactNode }) {
  const setCamera = useCanvasStore(state => state.setCamera)
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
  const onWheelZoom = useCallback((e: React.WheelEvent) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) e.preventDefault()
    const scale = useCanvasStore.getState().camera.scale
    const zoom = e.deltaY > 0 ? 0.9 : 1.1
    const nextScale = scale * zoom
    setCamera({ scale: Math.min(10, Math.max(0.2, nextScale)) })
  }, [setCamera])

  return (
    <div ref={ref} className="flex-1 relative overflow-hidden cursor-move" onMouseDown={onMouseDown} onWheel={onWheelZoom}>
      {children}
    </div>
  )
}
