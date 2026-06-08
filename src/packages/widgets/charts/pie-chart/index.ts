import { ChartPie } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { DonutChartComponent } from '../donut-chart/component'
import { DONUT_CHART_PROPS_GROUPS } from '../donut-chart/props-config'
import type { DonutChartProps } from '../donut-chart/types'
import { DEFAULT_PIE_PROPS } from './default-props'
import { PieChartPreview } from './preview'

/**
 * Pie chart — a thin preset over the donut (same props/component, solid by
 * default). Separate registry entry so it lists as its own material.
 */
export const pieChartMeta: WidgetMeta<DonutChartProps> = {
  type: 'pie-chart',
  version: '1.0.0',
  category: 'chart',
  title: '饼图',
  description: '分类占比 · 实心饼',
  icon: ChartPie,
  tags: ['图表', 'pie', '饼图', '占比'],

  defaultProps: DEFAULT_PIE_PROPS,
  defaultLayout: { width: 400, height: 400 },
  defaultName: (i) => `饼图 ${i + 1}`,

  propsGroups: DONUT_CHART_PROPS_GROUPS,

  dataSchema: {
    slots: [
      { name: 'name', label: '分类', role: 'dimension', accepts: ['string'], cardinality: 'one' },
      { name: 'value', label: '数值', role: 'measure', accepts: ['number'], cardinality: 'one' },
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
  Preview: PieChartPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 160, height: 160 },
  },
}

export default pieChartMeta
