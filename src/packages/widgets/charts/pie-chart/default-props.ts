import { DEFAULT_DONUT_PROPS } from '../donut-chart/default-props'
import type { DonutChartProps } from '../donut-chart/types'

/**
 * Pie chart = donut preset with no inner hole. Reuses the donut's props
 * shape + component; only the defaults (title + `innerRadiusPercent: 0`)
 * differ.
 */
export const DEFAULT_PIE_PROPS: DonutChartProps = {
  ...DEFAULT_DONUT_PROPS,
  title: '饼图',
  innerRadiusPercent: 0,
}
