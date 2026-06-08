import type { RectProps } from './types'

export const DEFAULT_RECT_PROPS: RectProps = {
  // Concrete brand colour so the palette-paint pass on add keeps it aligned
  // with the project palette (same convention as the chart widgets).
  fill: '#0D99FF',
  borderColor: '#0D99FF',
  borderWidth: 0,
  radius: 8,
}
