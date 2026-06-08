import type { ClockProps } from './types'

export const DEFAULT_CLOCK_PROPS: ClockProps = {
  mode: 'datetime',
  use24h: true,
  showSeconds: true,
  showWeekday: false,
  dateSep: '-',
  font: { color: '#1E1E1E', size: 20, weight: 'normal' },
  align: 'center',
}
