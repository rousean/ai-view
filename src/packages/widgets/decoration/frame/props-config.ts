import { Frame, Palette } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

export const FRAME_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'frame',
    title: '边框',
    icon: Frame,
    defaultOpen: true,
    fields: [
      { path: 'color', setter: 'ColorSetter', label: '颜色' },
      { path: 'fill', setter: 'ColorSetter', label: '填充' },
      {
        path: 'radius',
        setter: 'SliderSetter',
        label: '圆角',
        setterProps: { min: 0, max: 40, step: 1, unit: 'px' },
      },
      { path: 'glow', setter: 'BooleanSetter', label: '发光' },
    ],
  },
  {
    key: 'border',
    title: '描边',
    icon: Frame,
    defaultOpen: false,
    enableToggle: { path: 'showBorder' },
    fields: [
      {
        path: 'borderWidth',
        setter: 'SliderSetter',
        label: '粗细',
        setterProps: { min: 0, max: 8, step: 0.5, unit: 'px' },
      },
    ],
  },
  {
    key: 'corner',
    title: '角标',
    icon: Frame,
    defaultOpen: true,
    fields: [
      {
        path: 'cornerLength',
        setter: 'SliderSetter',
        label: '长度',
        setterProps: { min: 0, max: 60, step: 1, unit: 'px' },
      },
      {
        path: 'cornerWidth',
        setter: 'SliderSetter',
        label: '粗细',
        setterProps: { min: 1, max: 8, step: 0.5, unit: 'px' },
      },
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
