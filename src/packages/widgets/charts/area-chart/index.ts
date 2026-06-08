import { AreaChart } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { LineChartComponent } from '../line-chart/component'
import { LINE_CHART_PROPS_GROUPS } from '../line-chart/props-config'
import type { LineChartProps } from '../line-chart/types'
import { DEFAULT_AREA_PROPS } from './default-props'
import { AreaChartPreview } from './preview'

/**
 * Area chart — a thin preset over the line chart (same props, same
 * component, area fill on by default). Kept as its own registry entry so
 * it shows up as a distinct material with its own thumbnail / defaults.
 */
export const areaChartMeta: WidgetMeta<LineChartProps> = {
  type: 'area-chart',
  version: '1.0.0',
  category: 'chart',
  title: '面积图',
  description: '带填充的趋势图 · 支持多系列',
  icon: AreaChart,
  tags: ['图表', 'area', '面积', '趋势'],

  defaultProps: DEFAULT_AREA_PROPS,
  defaultLayout: { width: 520, height: 320 },
  defaultName: (i) => `面积图 ${i + 1}`,

  propsGroups: LINE_CHART_PROPS_GROUPS,

  dataSchema: {
    slots: [
      { name: 'x', label: '类目', role: 'dimension', accepts: ['string', 'date'], cardinality: 'one' },
      { name: 'y', label: '数值（多系列）', role: 'measure', accepts: ['number'], cardinality: 'many' },
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
  Preview: AreaChartPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 200, height: 140 },
  },
}

export default areaChartMeta
