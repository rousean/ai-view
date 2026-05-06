import { useCanvasStore } from '../../store/use-canvas-store'
import { useCallback, forwardRef, type ForwardedRef } from 'react'

export default forwardRef(function CanvasViewport ({ children }: { children: React.ReactNode }, ref: ForwardedRef<HTMLDivElement>) {
  const setCamera = useCanvasStore(state => state.setCamera)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const { x, y } = useCanvasStore.getState().camera

    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - e.clientX
      const dy = ev.clientY - e.clientY
      setCamera({ x: x + dx,  y: y + dy })
    }

    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [])

  const onWheelZoom = useCallback((e: React.WheelEvent) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) e.preventDefault()
    const scale = useCanvasStore.getState().camera.scale
    const zoom = e.deltaY > 0 ? 0.9 : 1.1
    const nextScale = scale * zoom
    setCamera({ scale: Math.min(10, Math.max(0.2, nextScale)) })
  }, [])

  return (
    <div ref={ref} className="relative overflow-hidden cursor-move" onMouseDown={onMouseDown} onWheel={onWheelZoom}>
      {children}
    </div>
  )
})
