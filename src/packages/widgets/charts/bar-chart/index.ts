import { z } from 'zod'
import type { WidgetMeta } from '../../widget-meta'
import { BarChartComponent } from './component'
import { DEFAULT_BAR_PROPS } from './default-props'
import { BarChartPreview } from './preview'
import { BAR_CHART_PROPS_CONFIG, BAR_CHART_PROPS_GROUPS } from './props-config'
import type { BarChartProps } from './types'

const FontStyleSchema = z.object({
  color: z.string().optional(),
  size: z.number().optional(),
  weight: z.union([z.literal('normal'), z.literal('bold'), z.number()]).optional(),
  italic: z.boolean().optional(),
})

const BarChartPropsSchema = z.object({
  title: z.string(),
  showTitle: z.boolean(),
  titleFont: FontStyleSchema,
  showLegend: z.boolean(),
  legendFont: FontStyleSchema,
  showXAxis: z.boolean(),
  xAxisFont: FontStyleSchema,
  showYAxis: z.boolean(),
  yAxisFont: FontStyleSchema,
  showYGrid: z.boolean(),
  barColor: z.string(),
  barRadius: z.number(),
  showLabels: z.boolean(),
  labelFont: FontStyleSchema,
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
  propsGroups: BAR_CHART_PROPS_GROUPS,

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
  Preview: BarChartPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 200, height: 140 },
  },
}

export default barChartMeta
export type { BarChartProps }
