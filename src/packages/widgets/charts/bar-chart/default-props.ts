import type { BarChartProps } from './types'

export const DEFAULT_BAR_PROPS: BarChartProps = {
  // Title
  title: '柱状图',
  showTitle: true,
  titleFont: { color: '#1E1E1E', size: 14, weight: 'normal' },
  // Legend
  showLegend: false,
  legendFont: { color: '#1E1E1E', size: 11, weight: 'normal' },
  // X axis
  showXAxis: true,
  xAxisFont: { color: '#1E1E1E', size: 11, weight: 'normal' },
  // Y axis
  showYAxis: true,
  yAxisFont: { color: '#1E1E1E', size: 11, weight: 'normal' },
  showYGrid: true,
  // Series — concrete colour rather than empty string. The palette
  // system covers the "follow theme" use case via `addWidget`'s
  // automatic paint pass, so the legacy `'' = use theme` sentinel is
  // gone. Keeping a real default also stops isEqualForReset() from
  // marking the bar as "modified" on freshly added widgets.
  barColor: '#0D99FF',
  barRadius: 4,
  // Data labels
  showLabels: false,
  labelFont: { color: '#1E1E1E', size: 11, weight: 'normal' },
}
