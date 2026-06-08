import { Clock, Palette, Settings2 } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

export const CLOCK_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'clock',
    title: '时间',
    icon: Clock,
    defaultOpen: true,
    fields: [
      {
        path: 'mode',
        setter: 'SelectSetter',
        label: '显示',
        setterProps: {
          options: [
            { value: 'datetime', label: '日期 + 时间' },
            { value: 'date', label: '仅日期' },
            { value: 'time', label: '仅时间' },
          ],
        },
      },
      { path: 'use24h', setter: 'BooleanSetter', label: '24 小时制' },
      { path: 'showSeconds', setter: 'BooleanSetter', label: '显示秒' },
      { path: 'showWeekday', setter: 'BooleanSetter', label: '显示星期' },
      {
        path: 'dateSep',
        setter: 'SelectSetter',
        label: '日期分隔',
        setterProps: {
          options: [
            { value: '-', label: '2026-01-01' },
            { value: '/', label: '2026/01/01' },
            { value: '.', label: '2026.01.01' },
          ],
        },
      },
    ],
  },
  {
    key: 'style',
    title: '样式',
    icon: Settings2,
    defaultOpen: true,
    fields: [
      { path: 'font', setter: 'FontSetter', label: '字体' },
      {
        path: 'align',
        setter: 'SelectSetter',
        label: '对齐',
        setterProps: {
          options: [
            { value: 'left', label: '左对齐' },
            { value: 'center', label: '居中' },
            { value: 'right', label: '右对齐' },
          ],
        },
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
