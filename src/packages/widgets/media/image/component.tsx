import * as React from 'react'
import type { WidgetRenderProps } from '../../widget-meta'
import type { ImageProps } from './types'
import { DEFAULT_IMAGE_PROPS } from './default-props'

/**
 * Image widget — renders an `<img>` filled to the box per `fit`. Empty
 * `src` shows a dashed placeholder so a freshly dropped image is visible
 * and obviously needs a URL, rather than rendering nothing.
 */
export const ImageComponent: React.FC<WidgetRenderProps<ImageProps>> = ({
  props: rawProps,
  layout,
}) => {
  const props = { ...DEFAULT_IMAGE_PROPS, ...rawProps }
  const radius = props.radius || 0

  if (!props.src) {
    return (
      <div
        style={{
          width: layout.width,
          height: layout.height,
          display: 'grid',
          placeItems: 'center',
          borderRadius: radius,
          background: 'rgba(127,127,127,0.08)',
          border: '1px dashed rgba(127,127,127,0.35)',
          color: 'rgba(127,127,127,0.75)',
          fontSize: 12,
          boxSizing: 'border-box',
        }}
      >
        图片
      </div>
    )
  }

  return (
    <img
      src={props.src}
      alt=""
      draggable={false}
      style={{
        width: layout.width,
        height: layout.height,
        objectFit: props.fit,
        borderRadius: radius,
        display: 'block',
      }}
    />
  )
}
