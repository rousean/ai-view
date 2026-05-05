import { AxisX, AxisY } from './coordinate'
import { useCanvasStore } from '../../store/use-canvas-store'

export default function CanvasAxis({ children }: { children: React.ReactNode }) {
  const camera = useCanvasStore(state => state.camera)

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 rounded-md border border-gray-200 bg-white overflow-hidden">
      <div className="flex h-5 shrink-0 text-blue-500">
        <div className="w-5"></div>
        <AxisX width={viewportSize.width} camera={camera}></AxisX>
      </div>
      <div className="flex flex-1 min-h-0 min-w-0 text-blue-500">
        <AxisY height={viewportSize.height} camera={camera}></AxisY>
        {children}
      </div>
    </div>
  )
}
