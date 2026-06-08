import * as React from 'react'
import type { WidgetRenderProps } from '../../widget-meta'
import type { RectProps } from './types'
import { DEFAULT_RECT_PROPS } from './default-props'

/**
 * Rectangle / panel — a styled box used as a backing panel, divider, or
 * colour block in 大屏 layouts. Pure CSS box; no data.
 */
export const RectComponent: React.FC<WidgetRenderProps<RectProps>> = ({
  props: rawProps,
  layout,
}) => {
  const props = { ...DEFAULT_RECT_PROPS, ...rawProps }
  return (
    <div
      style={{
        width: layout.width,
        height: layout.height,
        background: props.fill,
        border:
          props.borderWidth > 0
            ? `${props.borderWidth}px solid ${props.borderColor}`
            : undefined,
        borderRadius: props.radius,
        boxSizing: 'border-box',
      }}
    />
  )
}
