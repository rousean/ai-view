import { useMemo } from 'react'
import { scaleLinear } from 'd3'
import type { Camera } from '../../store/use-canvas-store'

export function Gridding({ width, height }: { width: number; height: number }) {
  const xTicks = useMemo(() => getTicks(width), [width])
  const yTicks = useMemo(() => getTicks(height), [height])

  return (
    <svg
      data-canvas-background
      className="absolute inset-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <g transform="translate(0, 0)" stroke="currentColor">
        {xTicks.map(tick => {
          const major = isMajorTick(tick)
          return <line key={`grid-x-${tick}`} x1={tick} x2={tick} y1={0} y2={height} strokeWidth={major ? 1 : 0.5} strokeOpacity={major ? 0.35 : 0.2} />
        })}
        {yTicks.map(tick => {
          const major = isMajorTick(tick)
          return <line key={`grid-y-${tick}`} x1={0} x2={width} y1={tick} y2={tick} strokeWidth={major ? 1 : 0.5} strokeOpacity={major ? 0.35 : 0.2} />
        })}
      </g>
    </svg>
  )
}

export function AxisX({ width, height = 20, camera }: { width: number; height?: number; camera: Camera }) {
  const { x, scale } = camera
  const left = -x / scale
  const right = left + width / scale

  const tickStep = getTickStep(scale)
  const xTicks = useMemo(() => getVisibleTicks(left, right, tickStep), [left, right, tickStep])

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g fill="currentColor">
        <line x1={0} y1={height} x2={width} y2={height} stroke="currentColor" strokeWidth={0.5} />
        {xTicks.map(tick => { 
          const X = (tick - left) * scale
          if (X < 0 || X > width) return null
          const major = isMajorTick(tick, tickStep)
          return (
            <g key={`x-tick-${tick}`}>
              <line x1={X} y1={height} x2={X} y2={height - (major ? 6 : 3)} stroke="currentColor" strokeWidth={0.5} />
              {major && (
                <text x={X + 6} y={height - 12} fontSize={10} textAnchor="middle" dominantBaseline="middle">
                  {Math.round(tick)}
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

export function AxisY({ width = 20, height, camera }: { width?: number; height: number; camera: Camera }) {
  const { y, scale } = camera
  const top = -y / scale
  const bottom = top + height / scale
  const tickStep = getTickStep(scale)
  const yTicks = useMemo(() => getVisibleTicks(top, bottom, tickStep), [top, bottom, tickStep])

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g fill="currentColor">
        <line x1={width} y1={0} x2={width} y2={height} stroke="currentColor" strokeWidth={0.5} />
        {yTicks.map(tick => {
          const Y = (tick - top) * scale
          if (Y < 0 || Y > height) return null
          const major = isMajorTick(tick, tickStep)
          return (
            <g key={`y-tick-${tick}`}>
              <line x1={width} y1={Y} x2={width - (major ? 6 : 3)} y2={Y} stroke="currentColor" strokeWidth={0.5} />
              {major && (
                <text x={width - 12} y={Y + 6} fontSize={10} writingMode="tb" textAnchor="middle" dominantBaseline="middle">
                  {Math.round(tick)}
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function getTicks(size: number) {
  return scaleLinear([0, size], [0, size]).ticks(Math.max(1, Math.floor(size / 10)))
}

function getVisibleTicks(start: number, end: number, step = 10) {
  const first = Math.floor(start / step) * step
  const ticks: number[] = []

  for (let tick = first; tick <= end; tick += step) {
    ticks.push(tick)
  }

  return ticks
}

function getTickStep(scale: number, minPixelStep = 8) {
  return getNiceStep(minPixelStep / scale)
}

function getNiceStep(rawStep: number) {
  const exponent = Math.floor(Math.log10(rawStep))
  const base = 10 ** exponent
  const normalized = rawStep / base

  if (normalized <= 1) return base
  if (normalized <= 2) return 2 * base
  if (normalized <= 5) return 5 * base
  return 10 * base
}

function isMajorTick(value: number, tickStep = 10) {
  const majorStep = tickStep * 10
  return Math.abs(value / majorStep - Math.round(value / majorStep)) < 1e-6
}
