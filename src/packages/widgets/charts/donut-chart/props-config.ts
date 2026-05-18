import type { PropConfig } from '../../widget-meta'

export const DONUT_CHART_PROPS_CONFIG: PropConfig[] = [
  {
    path: 'title',
    setter: 'StringSetter',
    label: '标题',
    group: '配置',
    setterProps: { placeholder: '图表标题' },
  },
  {
    path: 'showLabels',
    setter: 'BooleanSetter',
    label: '显示分类名',
    group: '配置',
  },
  {
    path: 'enableHover',
    setter: 'BooleanSetter',
    label: '悬停效果',
    group: '配置',
  },
  {
    path: 'innerRadiusPercent',
    setter: 'SliderSetter',
    label: '内圆半径',
    description: '0% = 实心饼图，100% = 极细圆环',
    setterProps: { min: 0, max: 100, step: 1, unit: '%' },
    group: '样式',
  },
  {
    path: 'cornerRadius',
    setter: 'SliderSetter',
    label: '圆角',
    setterProps: { min: 0, max: 30, step: 1, unit: 'px' },
    group: '样式',
  },
  {
    path: 'padAngle',
    setter: 'SliderSetter',
    label: '扇区间距',
    setterProps: { min: 0, max: 0.1, step: 0.005, unit: 'rad' },
    group: '样式',
  },
  {
    path: 'padding',
    setter: 'SliderSetter',
    label: '内边距',
    setterProps: { min: 0, max: 80, step: 1, unit: 'px' },
    group: '样式',
  },
]
