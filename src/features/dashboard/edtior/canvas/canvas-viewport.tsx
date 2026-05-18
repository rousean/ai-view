import { useCanvasStore } from '../../store/use-canvas-store'
import { useCallback, forwardRef, type ForwardedRef } from 'react'

export default forwardRef(function CanvasViewport(
  { children }: { children: React.ReactNode },
  ref: ForwardedRef<HTMLDivElement>,
) {
  const setCamera = useCanvasStore((state) => state.setCamera)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const { x, y } = useCanvasStore.getState().camera

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - e.clientX
      const dy = ev.clientY - e.clientY
      setCamera({ x: x + dx, y: y + dy })
    }

    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
    }

    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }, [])

  const onWheelZoom = useCallback((e: React.WheelEvent) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) e.preventDefault()
    const { x, y, scale } = useCanvasStore.getState().camera
    const zoom = e.deltaY > 0 ? 0.9 : 1.1
    const nextScale = Math.min(10, Math.max(0.2, scale * zoom))
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const nextX = mx - (mx - x) * (nextScale / scale)
    const nextY = my - (my - y) * (nextScale / scale)
    setCamera({ x: nextX, y: nextY, scale: nextScale })
  }, [])

  return (
    <div
      ref={ref}
      className="relative overflow-hidden cursor-move"
      onPointerDown={onPointerDown}
      onWheel={onWheelZoom}
    >
      {children}
    </div>
  )
})
