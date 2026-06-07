import type { FontStyle } from '@designer/setters'

/** Text widget props. Validated by zod inside index.ts. */
export interface TextProps {
  /** The text body. Supports newlines (rendered with `pre-wrap`). */
  content: string
  /** Compound font style (colour + size + weight + italic). */
  font: FontStyle
  /** Horizontal alignment of the text. */
  align: 'left' | 'center' | 'right'
  /** Vertical alignment within the widget box. */
  valign: 'top' | 'middle' | 'bottom'
  /** Line height as a multiple of the font size. */
  lineHeight: number
  /** Letter spacing in px. */
  letterSpacing: number
  /** Background colour. `'transparent'` (default) shows the canvas behind. */
  background: string
  /** Inner padding in px. */
  padding: number
  /** Wrap long lines vs. clip on a single line. */
  wrap: boolean
}
