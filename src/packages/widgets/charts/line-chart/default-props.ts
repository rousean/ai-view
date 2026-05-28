import type { LineChartProps } from './types'

/**
 * Defaults ship with two pre-seeded series so the chart looks reasonable
 * the moment it's dragged in. Real series are reconciled from the
 * widget's data slot (`y` cardinality `'many'`), but the `series` prop
 * gives users a place to override colour/name/style per series even
 * before data is mapped — and the SeriesListSetter has rows to play with.
 */
export const DEFAULT_LINE_PROPS: LineChartProps = {
  // Title
  title: '折线图',
  showTitle: true,
  titleFont: { color: '#1E1E1E', size: 14, weight: 'normal' },
  // Legend
  showLegend: true,
  legendFont: { color: '#5B5B5B', size: 11, weight: 'normal' },
  // X axis
  showXAxis: true,
  xAxisFont: { color: '#5B5B5B', size: 11, weight: 'normal' },
  // Y axis
  showYAxis: true,
  yAxisFont: { color: '#5B5B5B', size: 11, weight: 'normal' },
  showYGrid: true,
  // Stroke
  lineWidth: 2,
  // Series — seeded so the SeriesListSetter has visible rows immediately
  series: [
    { id: 'series-a', name: '系列 1', color: '#0D99FF', smooth: 0.4, showSymbol: true, area: false },
    { id: 'series-b', name: '系列 2', color: '#7C5CFF', smooth: 0.4, showSymbol: true, area: false },
  ],
  // Data labels
  showLabels: false,
  labelFont: { color: '#1E1E1E', size: 11, weight: 'normal' },
}
