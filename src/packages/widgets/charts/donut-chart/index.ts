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
    fields: [
      { name: 'name', label: '分类', type: 'string', required: true },
      { name: 'value', label: '数值', type: 'number', required: true },
    ],
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
