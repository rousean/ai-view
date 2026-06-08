import type { GaugeChartProps } from './types'

export const DEFAULT_GAUGE_PROPS: GaugeChartProps = {
  title: '仪表盘',
  showTitle: true,
  titleFont: { color: '#1E1E1E', size: 14, weight: 'normal' },
  aggregate: 'last',
  min: 0,
  max: 100,
  decimals: 0,
  unit: '%',
  valueColor: '#0D99FF',
}
