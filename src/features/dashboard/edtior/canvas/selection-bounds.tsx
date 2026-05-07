import { useCallback, useMemo } from 'react'
import { useCanvasStore } from '../../store/use-canvas-store'

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

const MIN_SIZE = 1

const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

const handlePositions = {
  nw: '-top-1 -left-1 w-2 h-2 cursor-nwse-resize',
  ne: '-top-1 -right-1 w-2 h-2 cursor-nesw-resize',
  sw: '-bottom-1 -left-1 w-2 h-2 cursor-nesw-resize',
  se: '-bottom-1 -right-1 w-2 h-2 cursor-nwse-resize',
  n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-2 cursor-ns-resize',
  s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-2 cursor-ns-resize',
  w: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-5 cursor-ew-resize',
  e: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-5 cursor-ew-resize',
} as const

export default function SelectionBounds() {
  const box = useSelectionBox()
  const interaction = useSelectionInteraction(box)

  if (!box) return null

  return (
    <div
      className="pointer-events-none absolute"
      style={box.chromeStyle}
      onClick={e => e.stopPropagation()}
    >
      <div className="pointer-events-none absolute inset-0 border border-dashed border-blue-500" />

      <div
        className="pointer-events-auto absolute inset-0 cursor-move"
        onPointerDown={(e) => interaction.onPointerDown(e, 'move')}
      />

      {handles.map(handle => (
        <ResizeHandle
          key={handle}
          handle={handle}
          onPointerDown={(e) => interaction.onPointerDown(e, 'resize', handle)}
        />
      ))}
    </div>
  )
}

function ResizeHandle({ handle, onPointerDown }: { handle: ResizeHandle; onPointerDown: (e: React.PointerEvent) => void }) {
  const pos = handlePositions[handle]

  return (
    <div
      className={`pointer-events-auto absolute z-2 bg-white border border-blue-500 rounded-full hover:scale-125 transition ${pos}`}
      onPointerDown={onPointerDown}
    />
  )
}

function useSelectionBox() {
  const selectedIds = useCanvasStore(state => state.runtime.selectedIds)
  const elements = useCanvasStore(state => state.elements)

  return useMemo(() => {
    const selectedElements = Object.values(elements).filter(el => selectedIds.includes(el.id))
    if (selectedElements.length === 0) return null

    const bounds = getBounds(selectedElements.map(el => el.props.layout))
    const base = {
      left: `${bounds.x}px`,
      top: `${bounds.y}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
    }

    return {
      selectedElements,
      minX: bounds.x,
      minY: bounds.y,
      boxWidth: bounds.width,
      boxHeight: bounds.height,
      chromeStyle: { ...base, zIndex: 100 } as const,
    }
  }, [elements, selectedIds])
}

function useSelectionInteraction(box: ReturnType<typeof useSelectionBox> | null) {
  const pushHistorySnapshot = useCanvasStore(state => state.pushHistorySnapshot)
  const updateElement = useCanvasStore(state => state.updateElement)
  const translateElementsFromLayouts = useCanvasStore(state => state.translateElementsFromLayouts)

  const onPointerDown = useCallback((
    e: React.PointerEvent,
    type: 'move' | 'resize',
    handle?: ResizeHandle
  ) => {
    if (e.button !== 0 || !box) return
    e.stopPropagation()
    e.preventDefault()

    pushHistorySnapshot()

    const startX = e.clientX
    const startY = e.clientY
    const startBox = { x: box.minX, y: box.minY, width: box.boxWidth, height: box.boxHeight }
    const startLayouts = box.selectedElements.map(el => ({
      id: el.id,
      props: el.props,
      layout: { ...el.props.layout }
    }))

    const isAspectRatioLocked = (ev: PointerEvent) => ev.shiftKey

    const move = (ev: PointerEvent) => {
      const s = useCanvasStore.getState().camera.scale
      const dx = (ev.clientX - startX) / s
      const dy = (ev.clientY - startY) / s

      if (type === 'move') {
        const snapshot = Object.fromEntries(startLayouts.map(({ id, layout }) => [id, layout]))
        translateElementsFromLayouts(snapshot, dx, dy)
      } else if (type === 'resize' && handle) {
        const resized = getResizedBounds(startBox, handle, dx, dy, isAspectRatioLocked(ev))

        startLayouts.forEach(({ id, props, layout }) => {
          const left = resized.rawX + (layout.x - startBox.x) * resized.scaleX
          const right = resized.rawX + (layout.x + layout.width - startBox.x) * resized.scaleX
          const top = resized.rawY + (layout.y - startBox.y) * resized.scaleY
          const bottom = resized.rawY + (layout.y + layout.height - startBox.y) * resized.scaleY

          const newX = Math.round(Math.min(left, right))
          const newY = Math.round(Math.min(top, bottom))
          const newWidth = Math.max(MIN_SIZE, Math.round(Math.abs(right - left)))
          const newHeight = Math.max(MIN_SIZE, Math.round(Math.abs(bottom - top)))

          updateElement(
            id,
            {
              props: {
                ...props,
                layout: {
                  ...layout,
                  x: newX,
                  y: newY,
                  width: newWidth,
                  height: newHeight,
                },
              },
            },
            { history: false }
          )
        })
      }
    }

    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
    }

    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }, [box, pushHistorySnapshot, translateElementsFromLayouts, updateElement])

  return { onPointerDown }
}

function getBounds(positions: { x: number; y: number; width: number; height: number }[]) {
  const minX = Math.min(...positions.map(p => p.x))
  const minY = Math.min(...positions.map(p => p.y))
  const maxX = Math.max(...positions.map(p => p.x + p.width))
  const maxY = Math.max(...positions.map(p => p.y + p.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function getResizedBounds(
  startBox: { x: number; y: number; width: number; height: number },
  handle: ResizeHandle,
  dx: number,
  dy: number,
  lockAspectRatio: boolean = false
) {
  let rawLeft = startBox.x
  let rawRight = startBox.x + startBox.width
  let rawTop = startBox.y
  let rawBottom = startBox.y + startBox.height

  if (handle.includes('w')) rawLeft += dx
  if (handle.includes('e')) rawRight += dx
  if (handle.includes('n')) rawTop += dy
  if (handle.includes('s')) rawBottom += dy

  let finalWidth = rawRight - rawLeft
  let finalHeight = rawBottom - rawTop

  if (lockAspectRatio && startBox.width > 0 && startBox.height > 0) {
    const aspectRatio = startBox.width / startBox.height

    if (handle === 'n' || handle === 's') {
      finalWidth = finalHeight * aspectRatio
    } else if (handle === 'w' || handle === 'e') {
      finalHeight = finalWidth / aspectRatio
    } else {
      const scaleX = finalWidth / startBox.width
      const scaleY = finalHeight / startBox.height
      const scale = Math.abs(scaleX) > Math.abs(scaleY) ? scaleX : scaleY
      finalWidth = startBox.width * scale
      finalHeight = startBox.height * scale
    }
  }

  const rawWidth = finalWidth
  const rawHeight = finalHeight

  return {
    rawX: Math.min(rawLeft, rawRight),
    rawY: Math.min(rawTop, rawBottom),
    scaleX: rawWidth / startBox.width,
    scaleY: rawHeight / startBox.height,
    rawWidth,
    rawHeight,
  }
}