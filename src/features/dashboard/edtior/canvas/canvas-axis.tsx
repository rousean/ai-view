import { AxisX, AxisY } from './coordinate'
import { useCanvasStore } from '../../store/use-canvas-store'

export default function CanvasAxis({ viewportSize }: { viewportSize: { width: number, height: number } }) {
  const camera = useCanvasStore(state => state.camera)

  return (
    <>
      <div className="w-5"></div>
      <AxisX width={viewportSize.width} camera={camera}></AxisX>
      <AxisY height={viewportSize.height} camera={camera}></AxisY>
    </>
  )
}
