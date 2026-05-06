import { Gridding } from './coordinate'
import { useDroppable } from '@dnd-kit/react'
import { useCanvasStore } from '../../store/use-canvas-store'
import { useMarqueeSelection } from '../../hooks/use-marquee-selection'
import SelectionOverlay, { SelectionUnderlay } from './selection-overlay'
import CanvasElement from './canvas-element'
import MarqueeSelection from './marquee-selection'

export default function CanvasTransform() {
  const elements = useCanvasStore(state => state.elements)
  const width = useCanvasStore(state => state.canvas.width)
  const height = useCanvasStore(state => state.canvas.height)
  const { x, y, scale } = useCanvasStore(state => state.camera)
  const { ref } = useDroppable({ id: 'canvas' })
  const { onMouseDown } = useMarqueeSelection()

  return (
    <div
      ref={ref}
      className="absolute inset-0 origin-top-left isolate cursor-default"
      style={{ width, height, transform: `translate(${x}px, ${y}px) scale(${scale})` }}
      onMouseDown={onMouseDown}
    >
      <Gridding width={width} height={height}></Gridding>
      <SelectionUnderlay />
      {Object.values(elements).map(element => (
        <CanvasElement key={element.id} element={element}></CanvasElement>
      ))}
      <SelectionOverlay />
      <MarqueeSelection></MarqueeSelection>
    </div>
  )
}
