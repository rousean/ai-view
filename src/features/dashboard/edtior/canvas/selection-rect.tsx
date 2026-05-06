import { useCanvasStore } from '../../store/use-canvas-store'

export default function SelectionRect() {
  const selectionRect = useCanvasStore(state => state.runtime.selectionRect)
  if (!selectionRect) return null
  const { x, y, width, height } = selectionRect
  
  return (
    <div 
    className="absolute z-9999 pointer-events-none border border-blue-500 bg-blue-500/10"
    style={{ left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` }}
    >
    </div>
  )
}
