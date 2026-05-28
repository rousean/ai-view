/**
 * @widgets — widget meta definitions and rendering components.
 *
 * This package owns the WidgetMeta interface and exports an array of
 * built-in widgets. The designer is responsible for taking that array
 * and registering each entry into its WidgetRegistry.
 */

export * from './widget-meta'
export { useEcharts } from './shared/use-echarts'

import type { WidgetMeta } from './widget-meta'
import barChartMeta from './charts/bar-chart'
import donutChartMeta from './charts/donut-chart'
import lineChartMeta from './charts/line-chart'

/**
 * Built-in widget collection. Each P-phase that adds a widget appends
 * to this array. Designer plugins (BuiltinWidgetsPlugin) iterate it.
 */
export const builtinWidgets: WidgetMeta[] = [
  barChartMeta as unknown as WidgetMeta,
  lineChartMeta as unknown as WidgetMeta,
  donutChartMeta as unknown as WidgetMeta,
]

export { barChartMeta, donutChartMeta, lineChartMeta }
