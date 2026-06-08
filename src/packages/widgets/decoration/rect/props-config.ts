import { Palette, Square } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

/** Property-panel config for the Rectangle shape. */
export const RECT_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'style',
    title: '样式',
    icon: Square,
    defaultOpen: true,
    fields: [
      { path: 'fill', setter: 'ColorSetter', label: '填充' },
      {
        path: 'radius',
        setter: 'SliderSetter',
        label: '圆角',
        setterProps: { min: 0, max: 200, step: 1, unit: 'px' },
      },
      {
        path: 'borderWidth',
        setter: 'SliderSetter',
        label: '边框粗细',
        setterProps: { min: 0, max: 20, step: 1, unit: 'px' },
      },
      { path: 'borderColor', setter: 'ColorSetter', label: '边框颜色' },
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
