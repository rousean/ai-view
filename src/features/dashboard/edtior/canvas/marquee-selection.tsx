import { useCanvasStore } from '../../store/use-canvas-store'

export default function MarqueeSelection() {
  const selectionRect = useCanvasStore(state => state.runtime.selectionRect)
  if (!selectionRect) return null

  const { x, y, width, height } = selectionRect

  return (
    <div
      className="absolute pointer-events-none border border-blue-500 bg-blue-500/10 z-101"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  )
}
