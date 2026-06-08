import { Minus, Palette } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

export const DIVIDER_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'line',
    title: '分割线',
    icon: Minus,
    defaultOpen: true,
    fields: [
      {
        path: 'orientation',
        setter: 'SelectSetter',
        label: '方向',
        setterProps: {
          options: [
            { value: 'horizontal', label: '水平' },
            { value: 'vertical', label: '垂直' },
          ],
        },
      },
      { path: 'color', setter: 'ColorSetter', label: '颜色' },
      {
        path: 'thickness',
        setter: 'SliderSetter',
        label: '粗细',
        setterProps: { min: 1, max: 12, step: 1, unit: 'px' },
      },
      {
        path: 'lineStyle',
        setter: 'SelectSetter',
        label: '线型',
        setterProps: {
          options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' },
          ],
        },
      },
      { path: 'glow', setter: 'BooleanSetter', label: '发光' },
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
