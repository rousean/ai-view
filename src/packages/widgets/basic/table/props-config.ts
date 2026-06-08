import { Paintbrush, Palette, Table as TableIcon, Type } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

/** Property-panel config for the Table widget. Columns come straight from
 *  the bound/inline dataset's fields — only styling is configurable here. */
export const TABLE_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'header',
    title: '表头',
    icon: Type,
    enableToggle: { path: 'showHeader' },
    fields: [
      { path: 'headerFont', setter: 'FontSetter', label: '字体' },
      { path: 'headerBg', setter: 'ColorSetter', label: '背景' },
    ],
  },
  {
    key: 'body',
    title: '表体',
    icon: TableIcon,
    defaultOpen: true,
    fields: [
      { path: 'cellFont', setter: 'FontSetter', label: '字体' },
      {
        path: 'rowHeight',
        setter: 'SliderSetter',
        label: '行高',
        setterProps: { min: 20, max: 80, step: 1, unit: 'px' },
      },
      { path: 'striped', setter: 'BooleanSetter', label: '斑马纹' },
      { path: 'stripeColor', setter: 'ColorSetter', label: '斑马色' },
    ],
  },
  {
    key: 'border',
    title: '边框',
    icon: Paintbrush,
    defaultOpen: false,
    enableToggle: { path: 'border' },
    fields: [{ path: 'borderColor', setter: 'ColorSetter', label: '颜色' }],
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
