import * as React from 'react'
import type { WidgetRenderProps } from '../../widget-meta'
import type { TextProps } from './types'
import { DEFAULT_TEXT_PROPS } from './default-props'

const V_JUSTIFY: Record<TextProps['valign'], React.CSSProperties['justifyContent']> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
}

/**
 * Text widget — a pure, data-less display block. The outer flex box owns
 * vertical alignment + padding + background; the inner block owns the
 * horizontal text alignment and typography. `pre-wrap` keeps authored
 * newlines while still wrapping long lines (unless `wrap` is off).
 */
export const TextComponent: React.FC<WidgetRenderProps<TextProps>> = ({
  props: rawProps,
  layout,
}) => {
  const props = { ...DEFAULT_TEXT_PROPS, ...rawProps }
  const f = props.font ?? {}
  return (
    <div
      style={{
        width: layout.width,
        height: layout.height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: V_JUSTIFY[props.valign] ?? 'flex-start',
        background: props.background || 'transparent',
        padding: props.padding,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          color: f.color,
          fontSize: f.size,
          fontWeight: f.weight,
          fontStyle: f.italic ? 'italic' : undefined,
          textAlign: props.align,
          lineHeight: props.lineHeight,
          letterSpacing: props.letterSpacing ? `${props.letterSpacing}px` : undefined,
          whiteSpace: props.wrap ? 'pre-wrap' : 'pre',
          wordBreak: props.wrap ? 'break-word' : 'normal',
          overflow: 'hidden',
        }}
      >
        {props.content}
      </div>
    </div>
  )
}
