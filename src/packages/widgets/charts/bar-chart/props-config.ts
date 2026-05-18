import type { PropConfig } from '../../widget-meta'

export const BAR_CHART_PROPS_CONFIG: PropConfig[] = [
  {
    path: 'title',
    setter: 'StringSetter',
    label: '标题',
    group: '配置',
    setterProps: { placeholder: '图表标题' },
  },
  {
    path: 'showLegend',
    setter: 'BooleanSetter',
    label: '显示图例',
    group: '配置',
  },
  {
    path: 'showLabels',
    setter: 'BooleanSetter',
    label: '显示数值',
    group: '配置',
  },
  {
    path: 'showXAxis',
    setter: 'BooleanSetter',
    label: '显示 X 轴',
    group: '样式',
  },
  {
    path: 'showYAxis',
    setter: 'BooleanSetter',
    label: '显示 Y 轴',
    group: '样式',
  },
  {
    path: 'barColor',
    setter: 'ColorSetter',
    label: '柱体颜色',
    description: '留空使用主题色',
    group: '样式',
  },
  {
    path: 'barRadius',
    setter: 'SliderSetter',
    label: '圆角',
    setterProps: { min: 0, max: 20, step: 1, unit: 'px' },
    group: '样式',
  },
]
