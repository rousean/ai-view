/** Decorative divider line props. */
export interface DividerProps {
  orientation: 'horizontal' | 'vertical'
  color: string
  thickness: number
  lineStyle: 'solid' | 'dashed' | 'dotted'
  /** Soft glow around the line. */
  glow: boolean
}
