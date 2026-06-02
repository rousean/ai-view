import * as React from 'react'
import { useEditorStore } from '../stores/editor-store'

/**
 * X / Y rulers around the canvas viewport.
 *
 * Self-measuring — each ruler runs its own ResizeObserver on its host
 * element, so the parent only needs to position them via `style`. The
 * camera comes from the editor store directly.
 *
 * Render these as absolute-positioned overlays inside the canvas frame.
 */

const RULER_THICKNESS = 20

function getTickStep(scale: number, minPixelStep = 8): number {
  return getNiceStep(minPixelStep / scale)
}

function getNiceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(rawStep))
  const base = 10 ** exponent
  const normalized = rawStep / base
  if (normalized <= 1) return base
  if (normalized <= 2) return 2 * base
  if (normalized <= 5) return 5 * base
  return 10 * base
}

function getVisibleTicks(start: number, end: number, step = 10): number[] {
  const first = Math.floor(start / step) * step
  const ticks: number[] = []
  for (let t = first; t <= end; t += step) ticks.push(t)
  return ticks
}

function isMajorTick(value: number, tickStep = 10): boolean {
  const majorStep = tickStep * 10
  return Math.abs(value / majorStep - Math.round(value / majorStep)) < 1e-6
}

/** Small hook to keep a state-of-size in sync with the element's box. */
function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, size }
}

interface RulerProps {
  style?: React.CSSProperties
  className?: string
  /**
   * Called when the user starts dragging out of this ruler. Caller is
   * expected to take over the pointer (capture, move, up) — the ruler
   * just announces the intent. Cursor while down is forced to the
   * resize variant matching the eventual guide orientation.
   */
  onStartGuide?: (e: React.PointerEvent) => void
  /**
   * Double-click on the ruler. The caller adds a guide at the clicked
   * coordinate — a precise, drag-free alternative to dragging one out.
   */
  onDoubleClick?: (e: React.MouseEvent) => void
}

export const AxisX: React.FC<RulerProps> = ({ style, className, onStartGuide, onDoubleClick }) => {
  const camera = useEditorStore((s) => s.camera)
  const { ref, size } = useElementSize<HTMLDivElement>()
  const { width, height } = size

  const { x, scale } = camera
  const left = -x / scale
  const right = left + (width || 1) / scale
  const tickStep = getTickStep(scale)
  const xTicks = React.useMemo(
    () => (width > 0 ? getVisibleTicks(left, right, tickStep) : []),
    [left, right, tickStep, width],
  )

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, cursor: onStartGuide ? 'col-resize' : style?.cursor }}
      onPointerDown={onStartGuide ? (e) => onStartGuide(e) : undefined}
      onDoubleClick={onDoubleClick}
    >
      {width > 0 && height > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ pointerEvents: 'none' }}
        >
          <g fill="currentColor">
            <line
              x1={0}
              y1={height}
              x2={width}
              y2={height}
              stroke="currentColor"
              strokeWidth={0.5}
            />
            {xTicks.map((tick) => {
              const X = (tick - left) * scale
              if (X < 0 || X > width) return null
              const major = isMajorTick(tick, tickStep)
              return (
                <g key={`x-${tick}`}>
                  <line
                    x1={X}
                    y1={height}
                    x2={X}
                    y2={height - (major ? 6 : 3)}
                    stroke="currentColor"
                    strokeWidth={0.5}
                  />
                  {major && (
                    <text
                      x={X + 6}
                      y={height - 12}
                      fontSize={10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {Math.round(tick)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      )}
    </div>
  )
}

export const AxisY: React.FC<RulerProps> = ({ style, className, onStartGuide, onDoubleClick }) => {
  const camera = useEditorStore((s) => s.camera)
  const { ref, size } = useElementSize<HTMLDivElement>()
  const { width, height } = size

  const { y, scale } = camera
  const top = -y / scale
  const bottom = top + (height || 1) / scale
  const tickStep = getTickStep(scale)
  const yTicks = React.useMemo(
    () => (height > 0 ? getVisibleTicks(top, bottom, tickStep) : []),
    [top, bottom, tickStep, height],
  )

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, cursor: onStartGuide ? 'row-resize' : style?.cursor }}
      onPointerDown={onStartGuide ? (e) => onStartGuide(e) : undefined}
      onDoubleClick={onDoubleClick}
    >
      {width > 0 && height > 0 && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ pointerEvents: 'none' }}
        >
          <g fill="currentColor">
            <line
              x1={width}
              y1={0}
              x2={width}
              y2={height}
              stroke="currentColor"
              strokeWidth={0.5}
            />
            {yTicks.map((tick) => {
              const Y = (tick - top) * scale
              if (Y < 0 || Y > height) return null
              const major = isMajorTick(tick, tickStep)
              return (
                <g key={`y-${tick}`}>
                  <line
                    x1={width}
                    y1={Y}
                    x2={width - (major ? 6 : 3)}
                    y2={Y}
                    stroke="currentColor"
                    strokeWidth={0.5}
                  />
                  {major && (
                    <text
                      x={width - 12}
                      y={Y + 6}
                      fontSize={10}
                      writingMode="tb"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {Math.round(tick)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      )}
    </div>
  )
}

export const RULER_SIZE = RULER_THICKNESS
