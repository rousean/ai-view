import { Image as ImageIcon, Palette } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

/** Property-panel config for the Image widget. */
export const IMAGE_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'image',
    title: '图片',
    icon: ImageIcon,
    defaultOpen: true,
    fields: [
      {
        path: 'src',
        setter: 'StringSetter',
        label: '图片地址',
        setterProps: { placeholder: 'https://… 或 data:image/…' },
      },
      {
        path: 'fit',
        setter: 'SelectSetter',
        label: '填充方式',
        setterProps: {
          options: [
            { value: 'cover', label: '覆盖 (cover)' },
            { value: 'contain', label: '包含 (contain)' },
            { value: 'fill', label: '拉伸 (fill)' },
          ],
        },
      },
      {
        path: 'radius',
        setter: 'SliderSetter',
        label: '圆角',
        setterProps: { min: 0, max: 48, step: 1, unit: 'px' },
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
