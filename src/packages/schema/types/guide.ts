/**
 * A user-drawn guideline. Persisted on the page. Rendered as a thin colored
 * line. Used by SnapManager as a snap target with high priority.
 */
export interface Guide {
  id: string
  orientation: 'horizontal' | 'vertical'
  /** canvas-space pixel coordinate. */
  position: number
}
