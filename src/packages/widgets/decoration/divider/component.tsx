import * as React from 'react'
import type { WidgetRenderProps } from '../../widget-meta'
import type { DividerProps } from './types'
import { DEFAULT_DIVIDER_PROPS } from './default-props'

/** Divider — a styled line, centered in its box. */
export const DividerComponent: React.FC<WidgetRenderProps<DividerProps>> = ({
  props: rawProps,
  layout,
}) => {
  const props = { ...DEFAULT_DIVIDER_PROPS, ...rawProps }
  const isH = props.orientation === 'horizontal'
  return (
    <div
      style={{
        width: layout.width,
        height: layout.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          ...(isH
            ? { width: '100%', height: 0, borderTop: `${props.thickness}px ${props.lineStyle} ${props.color}` }
            : { height: '100%', width: 0, borderLeft: `${props.thickness}px ${props.lineStyle} ${props.color}` }),
          filter: props.glow ? `drop-shadow(0 0 ${Math.max(3, props.thickness * 2)}px ${props.color})` : undefined,
        }}
      />
    </div>
  )
}
