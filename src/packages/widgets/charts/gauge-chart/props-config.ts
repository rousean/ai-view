import { Gauge, Palette, Type } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

/** Property-panel config for the Gauge chart. */
export const GAUGE_CHART_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'title',
    title: '标题',
    icon: Type,
    enableToggle: { path: 'showTitle' },
    fields: [
      { path: 'title', setter: 'StringSetter', label: '文字', setterProps: { placeholder: '图表标题' } },
      { path: 'titleFont', setter: 'FontSetter', label: '样式' },
    ],
  },
  {
    key: 'value',
    title: '数值',
    icon: Gauge,
    defaultOpen: true,
    fields: [
      {
        path: 'aggregate',
        setter: 'SelectSetter',
        label: '聚合方式',
        setterProps: {
          options: [
            { value: 'last', label: '最新值' },
            { value: 'first', label: '最早值' },
            { value: 'sum', label: '求和' },
            { value: 'avg', label: '平均' },
            { value: 'max', label: '最大值' },
            { value: 'min', label: '最小值' },
          ],
        },
      },
      { path: 'min', setter: 'NumberSetter', label: '最小值' },
      { path: 'max', setter: 'NumberSetter', label: '最大值' },
      {
        path: 'decimals',
        setter: 'SliderSetter',
        label: '小数位',
        setterProps: { min: 0, max: 4, step: 1 },
      },
      { path: 'unit', setter: 'StringSetter', label: '单位', setterProps: { placeholder: '如 %' } },
      { path: 'valueColor', setter: 'ColorSetter', label: '进度颜色' },
    ],
  },
  {
    key: 'theme',
    title: '样式预设',
    icon: Palette,
    defaultOpen: false,
    description: '把当前样式保存为预设，下次新建组件一键套用。',
    fields: [],
  },
]
