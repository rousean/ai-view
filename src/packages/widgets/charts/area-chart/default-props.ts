import { DEFAULT_LINE_PROPS } from '../line-chart/default-props'
import type { LineChartProps } from '../line-chart/types'

/**
 * Area chart = line chart preset with `area` fill enabled on every series.
 * Reuses the line chart's props shape + component wholesale; only the
 * defaults (title + per-series `area: true`) differ.
 */
export const DEFAULT_AREA_PROPS: LineChartProps = {
  ...DEFAULT_LINE_PROPS,
  title: '面积图',
  series: DEFAULT_LINE_PROPS.series.map((s) => ({ ...s, area: true })),
}
