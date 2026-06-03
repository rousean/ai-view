import type { DonutChartProps } from './types'

export const DEFAULT_DONUT_PROPS: DonutChartProps = {
  title: '环形图',
  // Light by default so the title is legible on the dark large-screen
  // canvas (the old hard-coded #1e1e1e was invisible there).
  titleFont: { color: '#e6e6e6', size: 14, weight: 500 },
  innerRadiusPercent: 60,
  cornerRadius: 4,
  padAngle: 0.01,
  padding: 16,
  enableHover: true,
  showLabels: false,
}
