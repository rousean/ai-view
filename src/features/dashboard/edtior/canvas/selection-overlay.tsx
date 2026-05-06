import { useCallback, useMemo } from 'react'
import { useCanvasStore, type Element } from '../../store/use-canvas-store'
import { Z_OVERLAY } from './stack'

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

const MIN_SIZE = 1

/** 单击 vs 拖拽分界（canvas 坐标以外的屏幕像素） */
export const DRAG_THRESHOLD_PX = 5

/** 仅几何工具 */
export function getBounds(positions: { x: number; y: number; width: number; height: number }[]) {
  const minX = Math.min(...positions.map(p => p.x))
  const minY = Math.min(...positions.map(p => p.y))
  const maxX = Math.max(...positions.map(p => p.x + p.width))
  const maxY = Math.max(...positions.map(p => p.y + p.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function useSelectionBox() {
  const selectedIds = useCanvasStore(state => state.runtime.selectedIds)
  const elements = useCanvasStore(state => state.elements)
  const selectedElements = useMemo(
    () => Object.values(elements).filter(el => selectedIds.includes(el.id)),
    [elements, selectedIds]
  )

  return useMemo(() => {
    if (selectedElements.length === 0) return null
    const { x: minX, y: minY, width: boxWidth, height: boxHeight } = getBounds(
      selectedElements.map(el => el.props.layout)
    )
    const base = {
      left: `${minX}px`,
      top: `${minY}px`,
      width: `${boxWidth}px`,
      height: `${boxHeight}px`,
    }
    return {
      selectedElements,
      minX,
      minY,
      boxWidth,
      boxHeight,
      gapLayerStyle: base,
      chromeStyle: { ...base, zIndex: 100 } as const,
    }
  }, [selectedElements])
}

/** 叠在图表下面：缝里拖移 / 单击缝里清空选区 */
export function SelectionUnderlay() {
  const box = useSelectionBox()
  const pushHistorySnapshot = useCanvasStore(state => state.pushHistorySnapshot)
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds)

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()

      const startX = e.clientX
      const startY = e.clientY
      let dragStarted = false
      let snapshot: Record<string, Element['props']['layout']> | null = null

      const beginDragIfNeeded = () => {
        if (dragStarted) return true
        const state = useCanvasStore.getState()
        const idsToMove = state.runtime.selectedIds.filter(id => {
          const el = state.elements[id]
          return el && !el.runtime.locked
        })
        if (idsToMove.length === 0) return false
        snapshot = {}
        for (const id of idsToMove) {
          const el = state.elements[id]
          if (el) snapshot[id] = { ...el.props.layout }
        }
        pushHistorySnapshot()
        dragStarted = true
        return true
      }

      const move = (event: MouseEvent) => {
        const dist = Math.hypot(event.clientX - startX, event.clientY - startY)
        if (!dragStarted) {
          if (dist < DRAG_THRESHOLD_PX) return
          if (!beginDragIfNeeded()) return
        }
        if (!snapshot) return
        const { camera, translateElementsFromLayouts: translate } = useCanvasStore.getState()
        const dx = (event.clientX - startX) / camera.scale
        const dy = (event.clientY - startY) / camera.scale
        translate(snapshot, dx, dy)
      }

      const up = () => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        if (!dragStarted) {
          setSelectedIds([])
        }
      }

      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    },
    [pushHistorySnapshot, setSelectedIds]
  )

  if (!box) return null

  return (
    <div className="pointer-events-none absolute" style={box.gapLayerStyle}>
      <div className="pointer-events-auto absolute inset-0 cursor-move" onMouseDown={onMouseDown} />
    </div>
  )
}

export default function SelectionOverlay() {
  const box = useSelectionBox()
  const updateElement = useCanvasStore(state => state.updateElement)
  const pushHistorySnapshot = useCanvasStore(state => state.pushHistorySnapshot)

  const startResize = useCallback(
    (handle: ResizeHandle) => (e: React.MouseEvent<HTMLDivElement>) => {
      if (!box) return
      e.stopPropagation()
      e.preventDefault()

      const { selectedElements, minX, minY, boxWidth, boxHeight } = box
      const startX = e.clientX
      const startY = e.clientY
      const startBox = { x: minX, y: minY, width: boxWidth, height: boxHeight }
      const startElements = selectedElements.map(el => ({
        id: el.id,
        props: el.props,
        layout: { ...el.props.layout },
      }))

      pushHistorySnapshot()

      const move = (event: MouseEvent) => {
        const s = useCanvasStore.getState().camera.scale
        const dx = (event.clientX - startX) / s
        const dy = (event.clientY - startY) / s
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
            height: Math.max(MIN_SIZE, Math.round(Math.abs(bottom - top))),
          }
          updateElement(
            id,
            {
              props: {
                ...props,
                layout: {
                  ...props.layout,
                  ...nextLayout,
                },
              },
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
    },
    [box, pushHistorySnapshot, updateElement]
  )

  if (!box) return null

  return (
    <div className="pointer-events-none absolute" style={box.chromeStyle} onClick={e => e.stopPropagation()}>
      <div className="pointer-events-none absolute inset-0 border border-dashed border-blue-500" />
      <div
        className="pointer-events-auto absolute z-2 -top-1 -left-1 w-2 h-2 bg-white border border-blue-500 rounded-full cursor-nwse-resize hover:scale-125 transition"
        onMouseDown={startResize('nw')}
      />

      <div
        className="pointer-events-auto absolute z-2 -top-1 -right-1 w-2 h-2 bg-white border border-blue-500 rounded-full cursor-nesw-resize hover:scale-125 transition"
        onMouseDown={startResize('ne')}
      />

      <div
        className="pointer-events-auto absolute z-2 -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-500 rounded-full cursor-nesw-resize hover:scale-125 transition"
        onMouseDown={startResize('sw')}
      />

      <div
        className="pointer-events-auto absolute z-2 -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-500 rounded-full cursor-nwse-resize hover:scale-125 transition"
        onMouseDown={startResize('se')}
      />

      <div
        className="pointer-events-auto absolute z-2 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-2 bg-white border border-blue-500 rounded cursor-ns-resize hover:scale-110 transition"
        onMouseDown={startResize('n')}
      />

      <div
        className="pointer-events-auto absolute z-2 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-2 bg-white border border-blue-500 rounded cursor-ns-resize hover:scale-110 transition"
        onMouseDown={startResize('s')}
      />

      <div
        className="pointer-events-auto absolute z-2 left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-5 bg-white border border-blue-500 rounded cursor-ew-resize hover:scale-110 transition"
        onMouseDown={startResize('w')}
      />

      <div
        className="pointer-events-auto absolute z-2 right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-5 bg-white border border-blue-500 rounded cursor-ew-resize hover:scale-110 transition"
        onMouseDown={startResize('e')}
      />
    </div>
  )
}

function getResizedBounds(
  startBox: { x: number; y: number; width: number; height: number },
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
    height: Math.max(MIN_SIZE, Math.abs(rawBottom - rawTop)),
  }
}
