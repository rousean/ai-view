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

  // Data contract: one categorical X (string OR date), one numeric Y
  // for now (`cardinality: 'one'` keeps the data tab UI focused on the
  // common single-series case until multi-series UI lands).
  dataSchema: {
    slots: [
      {
        name: 'x',
        label: '类目',
        role: 'dimension',
        accepts: ['string', 'date'],
        cardinality: 'one',
      },
      {
        name: 'y',
        label: '数值',
        role: 'measure',
        accepts: ['number'],
        cardinality: 'one',
      },
    ],
    sample: {
      fields: [
        { name: '月份', type: 'string' },
        { name: '销量', type: 'number' },
      ],
      rows: [
        { 月份: '一月', 销量: 120 },
        { 月份: '二月', 销量: 200 },
        { 月份: '三月', 销量: 150 },
        { 月份: '四月', 销量: 80 },
        { 月份: '五月', 销量: 70 },
        { 月份: '六月', 销量: 110 },
      ],
    },
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
