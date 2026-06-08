import type { FontStyle } from '@designer/setters'

/** Live clock / date widget props. */
export interface ClockProps {
  /** What to show. */
  mode: 'datetime' | 'date' | 'time'
  use24h: boolean
  showSeconds: boolean
  showWeekday: boolean
  /** Date separator. */
  dateSep: '-' | '/' | '.'
  font: FontStyle
  align: 'left' | 'center' | 'right'
}
