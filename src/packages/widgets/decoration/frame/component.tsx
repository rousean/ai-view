import * as React from 'react'
import type { WidgetRenderProps } from '../../widget-meta'
import type { FrameProps } from './types'
import { DEFAULT_FRAME_PROPS } from './default-props'

/**
 * Tech frame — an (optional) thin rounded border plus four bright corner
 * brackets, the signature 大屏 decoration. Pure SVG, no data.
 */
export const FrameComponent: React.FC<WidgetRenderProps<FrameProps>> = ({ props: rawProps, layout }) => {
  const props = { ...DEFAULT_FRAME_PROPS, ...rawProps }
  const W = layout.width
  const H = layout.height
  const m = Math.max(props.cornerWidth / 2, 1) // inset so the stroke isn't clipped
  const c = props.cornerLength
  const hasFill = props.fill && props.fill !== 'transparent'

  const corners = [
    `${m + c},${m} ${m},${m} ${m},${m + c}`, // top-left
    `${W - m - c},${m} ${W - m},${m} ${W - m},${m + c}`, // top-right
    `${W - m},${H - m - c} ${W - m},${H - m} ${W - m - c},${H - m}`, // bottom-right
    `${m},${H - m - c} ${m},${H - m} ${m + c},${H - m}`, // bottom-left
  ]

  return (
    <svg
      width={W}
      height={H}
      style={{
        display: 'block',
        filter: props.glow ? `drop-shadow(0 0 4px ${props.color})` : undefined,
      }}
    >
      {hasFill && (
        <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={props.radius} fill={props.fill} />
      )}
      {props.showBorder && props.borderWidth > 0 && (
        <rect
          x={props.borderWidth / 2}
          y={props.borderWidth / 2}
          width={Math.max(W - props.borderWidth, 0)}
          height={Math.max(H - props.borderWidth, 0)}
          rx={props.radius}
          fill="none"
          stroke={props.color}
          strokeWidth={props.borderWidth}
          strokeOpacity={0.45}
        />
      )}
      {c > 0 &&
        corners.map((pts, i) => (
          <polyline
            key={i}
            points={pts}
            fill="none"
            stroke={props.color}
            strokeWidth={props.cornerWidth}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        ))}
    </svg>
  )
}
