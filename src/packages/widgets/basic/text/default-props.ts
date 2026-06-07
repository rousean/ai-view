import type { TextProps } from './types'

export const DEFAULT_TEXT_PROPS: TextProps = {
  content: '文本',
  // Same dark default as the chart widgets so freshly dropped text reads on
  // a light canvas; the palette-paint pass / user recolours for dark 大屏.
  font: { color: '#1E1E1E', size: 16, weight: 'normal' },
  align: 'left',
  valign: 'top',
  lineHeight: 1.4,
  letterSpacing: 0,
  background: 'transparent',
  padding: 8,
  wrap: true,
}
