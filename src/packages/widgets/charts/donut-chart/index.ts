import { ChartPie } from 'lucide-react'
import { z } from 'zod'
import type { WidgetMeta } from '../../widget-meta'
import { DonutChartComponent } from './component'
import { DEFAULT_DONUT_PROPS } from './default-props'
import { DONUT_CHART_PROPS_CONFIG } from './props-config'
import type { DonutChartProps } from './types'

const DonutChartPropsSchema = z.object({
  title: z.string(),
  innerRadiusPercent: z.number().min(0).max(100),
  cornerRadius: z.number().min(0),
  padAngle: z.number().min(0),
  padding: z.number().min(0),
  enableHover: z.boolean(),
  showLabels: z.boolean(),
})

export const donutChartMeta: WidgetMeta<DonutChartProps> = {
  type: 'donut-chart',
  version: '1.0.0',
  category: 'chart',
  title: '环形图',
  description: '分类占比一目了然',
  tags: ['图表', 'donut', 'pie', '环形', '饼图'],
  icon: ChartPie,

  defaultProps: DEFAULT_DONUT_PROPS,
  defaultLayout: { width: 400, height: 400 },
  defaultName: (i) => `环形图 ${i + 1}`,

  propsSchema: DonutChartPropsSchema,
  propsConfig: DONUT_CHART_PROPS_CONFIG,

  dataSchema: {
    slots: [
      {
        name: 'name',
        label: '分类',
        role: 'dimension',
        accepts: ['string'],
        cardinality: 'one',
      },
      {
        name: 'value',
        label: '数值',
        role: 'measure',
        accepts: ['number'],
        cardinality: 'one',
      },
    ],
    sample: {
      fields: [
        { name: '语言', type: 'string' },
        { name: '占比', type: 'number' },
      ],
      rows: [
        { 语言: 'JavaScript', 占比: 500 },
        { 语言: 'Python', 占比: 200 },
        { 语言: 'Java', 占比: 300 },
        { 语言: 'C++', 占比: 400 },
        { 语言: 'C#', 占比: 100 },
      ],
    },
  },

  Component: DonutChartComponent,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 160, height: 160 },
  },
}

export default donutChartMeta
export type { DonutChartProps }
