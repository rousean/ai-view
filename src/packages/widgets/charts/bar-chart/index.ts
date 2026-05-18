import { z } from 'zod'
import type { WidgetMeta } from '../../widget-meta'
import { BarChartComponent } from './component'
import { DEFAULT_BAR_PROPS } from './default-props'
import { BAR_CHART_PROPS_CONFIG } from './props-config'
import type { BarChartProps } from './types'

const BarChartPropsSchema = z.object({
  title: z.string(),
  showXAxis: z.boolean(),
  showYAxis: z.boolean(),
  barColor: z.string(),
  showLabels: z.boolean(),
  showLegend: z.boolean(),
  barRadius: z.number(),
})

export const barChartMeta: WidgetMeta<BarChartProps> = {
  type: 'bar-chart',
  version: '1.0.0',
  category: 'chart',
  title: '柱状图',
  description: '比较各分类项数值高低',
  tags: ['图表', 'bar', '柱状'],

  defaultProps: DEFAULT_BAR_PROPS,
  defaultLayout: { width: 480, height: 320 },
  defaultName: (i) => `柱状图 ${i + 1}`,

  propsSchema: BarChartPropsSchema,
  propsConfig: BAR_CHART_PROPS_CONFIG,

  dataSchema: {
    fields: [
      { name: 'x', label: '类目', type: 'string', required: true },
      { name: 'y', label: '数值', type: 'number', required: true },
    ],
  },

  Component: BarChartComponent,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 200, height: 140 },
  },
}

export default barChartMeta
export type { BarChartProps }
