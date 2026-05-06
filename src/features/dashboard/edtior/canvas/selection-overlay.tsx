import { useCanvasStore } from '../../store/use-canvas-store'

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

const MIN_SIZE = 1

export default function SelectionOverlay() {
  const selectedIds = useCanvasStore(state => state.runtime.selectedIds)
  const elements = useCanvasStore(state => state.elements)
  const scale = useCanvasStore(state => state.camera.scale)
  const updateElement = useCanvasStore(state => state.updateElement)
  const pushHistorySnapshot = useCanvasStore(state => state.pushHistorySnapshot)
  const selectedElements = Object.values(elements).filter(el => selectedIds.includes(el.id))
  if (selectedElements.length === 0) return null
  const bounds = getBounds(selectedElements.map(element => element.props.layout))
  const { x: minX, y: minY, width: boxWidth, height: boxHeight } = bounds
  const startResize = (handle: ResizeHandle) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const startBox = { x: minX, y: minY, width: boxWidth, height: boxHeight }
    const startElements = selectedElements.map(el => ({
      id: el.id,
      props: el.props,
      layout: { ...el.props.layout }
    }))

    pushHistorySnapshot()

    const move = (event: MouseEvent) => {
      const dx = (event.clientX - startX) / scale
      const dy = (event.clientY - startY) / scale
      const resizedBounds = getResizedBounds(startBox, handle, dx, dy)
      const scaleX = resizedBounds.rawWidth / startBox.width
      const scaleY = resizedBounds.rawHeight / startBox.height

      startElements.forEach(({ id, props, layout }) => {
        const left = resizedBounds.rawX + (layout.x - startBox.x) * scaleX
        const right = resizedBounds.rawX + (layout.x + layout.width - startBox.x) * scaleX
        const top = resizedBounds.rawY + (layout.y - startBox.y) * scaleY
        const bottom = resizedBounds.rawY + (layout.y + layout.height - startBox.y) * scaleY
        const nextLayout = {
          ...layout,
          x: Math.round(Math.min(left, right)),
          y: Math.round(Math.min(top, bottom)),
          width: Math.max(MIN_SIZE, Math.round(Math.abs(right - left))),
          height: Math.max(MIN_SIZE, Math.round(Math.abs(bottom - top)))
        }
        updateElement(
          id,
          {
            props: {
              ...props,
              layout: {
                ...props.layout,
                ...nextLayout
              }
            }
          },
          { history: false }
        )
      })
    }

    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  return (
    <div
      className="absolute z-9999 pointer-events-none"
      style={{
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${boxWidth}px`,
        height: `${boxHeight}px`
      }}
      onClick={e => e.stopPropagation()}
      >
      <div className="absolute inset-0 border border-dashed border-blue-500" />
      {/* ===== 四个角 ===== */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-blue-500 rounded-full cursor-nwse-resize hover:scale-125 transition pointer-events-auto" onMouseDown={startResize('nw')} />

      <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-blue-500 rounded-full cursor-nesw-resize hover:scale-125 transition pointer-events-auto" onMouseDown={startResize('ne')}/>

      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-500 rounded-full cursor-nesw-resize hover:scale-125 transition pointer-events-auto" onMouseDown={startResize('sw')}/>

      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-500 rounded-full cursor-nwse-resize hover:scale-125 transition pointer-events-auto" onMouseDown={startResize('se')}/>

      {/* ===== 上下中点 ===== */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-2 bg-white border border-blue-500 rounded cursor-ns-resize hover:scale-110 transition pointer-events-auto" onMouseDown={startResize('n')}/>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-2 bg-white border border-blue-500 rounded cursor-ns-resize hover:scale-110 transition pointer-events-auto" onMouseDown={startResize('s')}/>

      {/* ===== 左右中点 ===== */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-5 bg-white border border-blue-500 rounded cursor-ew-resize hover:scale-110 transition pointer-events-auto" onMouseDown={startResize('w')}/>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-5 bg-white border border-blue-500 rounded cursor-ew-resize hover:scale-110 transition pointer-events-auto" onMouseDown={startResize('e')}/>
    </div>
  )
}

function getResizedBounds(
  startBox: { x: number, y: number, width: number, height: number },
  handle: ResizeHandle,
  dx: number,
  dy: number
) {
  const startLeft = startBox.x
  const startRight = startBox.x + startBox.width
  const startTop = startBox.y
  const startBottom = startBox.y + startBox.height

  const rawLeft = handle.includes('w') ? startLeft + dx : startLeft
  const rawRight = handle.includes('e') ? startRight + dx : startRight
  const rawTop = handle.includes('n') ? startTop + dy : startTop
  const rawBottom = handle.includes('s') ? startBottom + dy : startBottom

  return {
    rawX: rawLeft,
    rawY: rawTop,
    rawWidth: rawRight - rawLeft,
    rawHeight: rawBottom - rawTop,
    x: Math.min(rawLeft, rawRight),
    y: Math.min(rawTop, rawBottom),
    width: Math.max(MIN_SIZE, Math.abs(rawRight - rawLeft)),
    height: Math.max(MIN_SIZE, Math.abs(rawBottom - rawTop))
  }
}

function getBounds(positions: { x: number, y: number, width: number, height: number }[]) {
  const minX = Math.min(...positions.map(position => position.x))
  const minY = Math.min(...positions.map(position => position.y))
  const maxX = Math.max(...positions.map(position => position.x + position.width))
  const maxY = Math.max(...positions.map(position => position.y + position.height))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}
