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
import lineChartMeta from './charts/line-chart'
import areaChartMeta from './charts/area-chart'
import donutChartMeta from './charts/donut-chart'
import pieChartMeta from './charts/pie-chart'
import gaugeChartMeta from './charts/gauge-chart'
import textMeta from './basic/text'
import tableMeta from './basic/table'
import clockMeta from './basic/clock'
import numberCardMeta from './indicator/number-card'
import imageMeta from './media/image'
import rectMeta from './decoration/rect'
import dividerMeta from './decoration/divider'
import frameMeta from './decoration/frame'

/**
 * Built-in widget collection. Each P-phase that adds a widget appends
 * to this array. Designer plugins (BuiltinWidgetsPlugin) iterate it.
 */
export const builtinWidgets: WidgetMeta[] = [
  barChartMeta as unknown as WidgetMeta,
  lineChartMeta as unknown as WidgetMeta,
  areaChartMeta as unknown as WidgetMeta,
  donutChartMeta as unknown as WidgetMeta,
  pieChartMeta as unknown as WidgetMeta,
  gaugeChartMeta as unknown as WidgetMeta,
  textMeta as unknown as WidgetMeta,
  tableMeta as unknown as WidgetMeta,
  clockMeta as unknown as WidgetMeta,
  numberCardMeta as unknown as WidgetMeta,
  imageMeta as unknown as WidgetMeta,
  rectMeta as unknown as WidgetMeta,
  dividerMeta as unknown as WidgetMeta,
  frameMeta as unknown as WidgetMeta,
]

export {
  barChartMeta,
  lineChartMeta,
  areaChartMeta,
  donutChartMeta,
  pieChartMeta,
  gaugeChartMeta,
  textMeta,
  tableMeta,
  clockMeta,
  numberCardMeta,
  imageMeta,
  rectMeta,
  dividerMeta,
  frameMeta,
}
