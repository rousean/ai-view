import { ChartLine } from 'lucide-react'
import { z } from 'zod'
import type { WidgetMeta } from '../../widget-meta'
import { LineChartComponent } from './component'
import { DEFAULT_LINE_PROPS } from './default-props'
import { LineChartPreview } from './preview'
import { LINE_CHART_PROPS_CONFIG, LINE_CHART_PROPS_GROUPS } from './props-config'
import type { LineChartProps } from './types'

const FontStyleSchema = z.object({
  color: z.string().optional(),
  size: z.number().optional(),
  weight: z.union([z.literal('normal'), z.literal('bold'), z.number()]).optional(),
  italic: z.boolean().optional(),
})

const LineSeriesConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  smooth: z.number().min(0).max(1),
  showSymbol: z.boolean(),
  area: z.boolean(),
})

const LineChartPropsSchema = z.object({
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
  lineWidth: z.number().min(1),
  series: z.array(LineSeriesConfigSchema),
  showLabels: z.boolean(),
  labelFont: FontStyleSchema,
})

export const lineChartMeta: WidgetMeta<LineChartProps> = {
  type: 'line-chart',
  version: '1.0.0',
  category: 'chart',
  title: '折线图',
  description: '展示连续指标随时间的趋势 · 支持多系列',
  tags: ['图表', 'line', '折线', '趋势'],
  icon: ChartLine,

  defaultProps: DEFAULT_LINE_PROPS,
  defaultLayout: { width: 520, height: 320 },
  defaultName: (i) => `折线图 ${i + 1}`,

  propsSchema: LineChartPropsSchema,
  propsConfig: LINE_CHART_PROPS_CONFIG,
  propsGroups: LINE_CHART_PROPS_GROUPS,

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
        label: '数值（多系列）',
        role: 'measure',
        accepts: ['number'],
        cardinality: 'many',
      },
    ],
    sample: {
      fields: [
        { name: '月份', type: 'string' },
        { name: '销量', type: 'number' },
        { name: '利润', type: 'number' },
      ],
      rows: [
        { 月份: '一月', 销量: 120, 利润: 30 },
        { 月份: '二月', 销量: 200, 利润: 80 },
        { 月份: '三月', 销量: 150, 利润: 60 },
        { 月份: '四月', 销量: 80, 利润: 20 },
        { 月份: '五月', 销量: 70, 利润: 35 },
        { 月份: '六月', 销量: 110, 利润: 55 },
      ],
    },
  },

  Component: LineChartComponent,
  Preview: LineChartPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 200, height: 140 },
  },
}

export default lineChartMeta
export type { LineChartProps, LineSeriesConfig } from './types'
