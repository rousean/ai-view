import { CircleDot, Palette, Sparkles, Type } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

export const DONUT_CHART_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'title',
    title: '标题',
    icon: Type,
    fields: [
      {
        path: 'title',
        setter: 'StringSetter',
        label: '文字',
        setterProps: { placeholder: '环形图标题' },
      },
      {
        path: 'titleFont',
        setter: 'FontSetter',
        label: '字体',
      },
    ],
  },
  {
    key: 'shape',
    title: '形状',
    icon: CircleDot,
    fields: [
      {
        path: 'innerRadiusPercent',
        setter: 'SliderSetter',
        label: '内圆半径',
        description: '0% = 实心饼图，100% = 极细圆环',
        setterProps: { min: 0, max: 100, step: 1, unit: '%' },
      },
      {
        path: 'cornerRadius',
        setter: 'SliderSetter',
        label: '圆角',
        setterProps: { min: 0, max: 30, step: 1, unit: 'px' },
      },
      {
        path: 'padAngle',
        setter: 'SliderSetter',
        label: '扇区间距',
        setterProps: { min: 0, max: 0.1, step: 0.005, unit: 'rad' },
      },
      {
        path: 'padding',
        setter: 'SliderSetter',
        label: '内边距',
        setterProps: { min: 0, max: 80, step: 1, unit: 'px' },
      },
    ],
  },
  {
    key: 'labels',
    title: '数据标签',
    icon: Type,
    defaultOpen: false,
    enableToggle: { path: 'showLabels' },
    fields: [],
  },
  {
    key: 'interaction',
    title: '交互',
    icon: Sparkles,
    defaultOpen: false,
    fields: [{ path: 'enableHover', setter: 'BooleanSetter', label: '悬停效果' }],
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
