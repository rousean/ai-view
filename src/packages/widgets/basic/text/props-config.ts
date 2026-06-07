import { AlignLeft, Paintbrush, Palette, Type } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

/**
 * Property-panel config for the Text widget. Content + font in the first
 * section (the 80% case), layout knobs next, box styling after, and the
 * shared 样式预设 hook last (same convention as the chart widgets).
 */
export const TEXT_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'content',
    title: '内容',
    icon: Type,
    defaultOpen: true,
    fields: [
      {
        path: 'content',
        setter: 'StringSetter',
        label: '文字',
        setterProps: { multiline: true, rows: 3, placeholder: '输入文本…' },
      },
      { path: 'font', setter: 'FontSetter', label: '字体' },
    ],
  },
  {
    key: 'layout',
    title: '排版',
    icon: AlignLeft,
    defaultOpen: true,
    fields: [
      {
        path: 'align',
        setter: 'SelectSetter',
        label: '水平对齐',
        setterProps: {
          options: [
            { value: 'left', label: '左对齐' },
            { value: 'center', label: '居中' },
            { value: 'right', label: '右对齐' },
          ],
        },
      },
      {
        path: 'valign',
        setter: 'SelectSetter',
        label: '垂直对齐',
        setterProps: {
          options: [
            { value: 'top', label: '顶部' },
            { value: 'middle', label: '居中' },
            { value: 'bottom', label: '底部' },
          ],
        },
      },
      {
        path: 'lineHeight',
        setter: 'SliderSetter',
        label: '行高',
        setterProps: { min: 1, max: 3, step: 0.1 },
      },
      {
        path: 'letterSpacing',
        setter: 'SliderSetter',
        label: '字间距',
        setterProps: { min: 0, max: 20, step: 0.5, unit: 'px' },
      },
      { path: 'wrap', setter: 'BooleanSetter', label: '自动换行' },
    ],
  },
  {
    key: 'box',
    title: '背景',
    icon: Paintbrush,
    defaultOpen: false,
    fields: [
      { path: 'background', setter: 'ColorSetter', label: '背景色' },
      {
        path: 'padding',
        setter: 'SliderSetter',
        label: '内边距',
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
