import { z } from 'zod'
import { Gauge } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { GaugeChartComponent } from './component'
import { DEFAULT_GAUGE_PROPS } from './default-props'
import { GaugeChartPreview } from './preview'
import { GAUGE_CHART_PROPS_GROUPS } from './props-config'
import type { GaugeChartProps } from './types'

const FontStyleSchema = z.object({
  color: z.string().optional(),
  size: z.number().optional(),
  weight: z.union([z.literal('normal'), z.literal('bold'), z.number()]).optional(),
  italic: z.boolean().optional(),
})

const GaugeChartPropsSchema = z.object({
  title: z.string(),
  showTitle: z.boolean(),
  titleFont: FontStyleSchema,
  aggregate: z.union([
    z.literal('last'),
    z.literal('first'),
    z.literal('sum'),
    z.literal('avg'),
    z.literal('max'),
    z.literal('min'),
  ]),
  min: z.number(),
  max: z.number(),
  decimals: z.number(),
  unit: z.string(),
  valueColor: z.string(),
})

export const gaugeChartMeta: WidgetMeta<GaugeChartProps> = {
  type: 'gauge-chart',
  version: '1.0.0',
  category: 'chart',
  title: '仪表盘',
  description: '单值进度 · 完成率 / 占比',
  icon: Gauge,
  tags: ['图表', 'gauge', '仪表盘', '进度', '完成率'],

  defaultProps: DEFAULT_GAUGE_PROPS,
  defaultLayout: { width: 300, height: 260 },
  defaultName: (i) => `仪表盘 ${i + 1}`,

  propsSchema: GaugeChartPropsSchema,
  propsGroups: GAUGE_CHART_PROPS_GROUPS,

  dataSchema: {
    slots: [
      { name: 'value', label: '数值', role: 'measure', accepts: ['number'], cardinality: 'one' },
    ],
    sample: {
      fields: [{ name: '完成率', type: 'number' }],
      rows: [{ 完成率: 72 }],
    },
  },

  Component: GaugeChartComponent,
  Preview: GaugeChartPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 160, height: 140 },
  },
}

export default gaugeChartMeta
export type { GaugeChartProps }
