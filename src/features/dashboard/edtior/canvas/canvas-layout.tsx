import { useEffect, useRef, useState, RefObject } from "react"
import CanvasAxis from "./canvas-axis"
import CanvasViewport from "./canvas-viewport"
import Canvas from "./canvas"

export default function CanvasLayout() {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    if (viewportRef.current) observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [viewportRef])

  return (
    <div className="grid grid-cols-[20px_1fr] grid-rows-[20px_1fr] border border-gray-200 rounded-md bg-white overflow-hidden text-blue-500 flex-1">
      <CanvasAxis viewportSize={viewportSize}></CanvasAxis>
      <CanvasViewport ref={viewportRef as RefObject<HTMLDivElement>}>
        <Canvas></Canvas>
      </CanvasViewport>
    </div>
  )
}
