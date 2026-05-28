import { Activity, Grid3x3, Hash, Palette, Tag, Type } from 'lucide-react'
import type { PropConfig, PropGroupDef } from '../../widget-meta'

/** Legacy flat config — kept for back-compat. */
export const LINE_CHART_PROPS_CONFIG: PropConfig[] = [
  { path: 'title', setter: 'StringSetter', label: '标题', tab: '设计' },
  { path: 'lineWidth', setter: 'SliderSetter', label: '线宽', setterProps: { min: 1, max: 8, step: 1, unit: 'px' }, tab: '设计' },
]

/**
 * Nested config. The `系列` group hands off to SeriesListSetter, which
 * renders the array as a dnd-kit sortable list with per-row colour /
 * name editing.
 */
export const LINE_CHART_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'title',
    title: '标题',
    icon: Type,
    enableToggle: { path: 'showTitle' },
    fields: [
      { path: 'title', setter: 'StringSetter', label: '文字', setterProps: { placeholder: '图表标题' } },
      { path: 'titleFont', setter: 'FontSetter', label: '样式' },
    ],
  },
  {
    key: 'legend',
    title: '图例',
    icon: Tag,
    defaultOpen: false,
    enableToggle: { path: 'showLegend' },
    fields: [{ path: 'legendFont', setter: 'FontSetter', label: '样式' }],
  },
  {
    key: 'xAxis',
    title: 'X 轴',
    icon: Grid3x3,
    defaultOpen: false,
    enableToggle: { path: 'showXAxis' },
    fields: [{ path: 'xAxisFont', setter: 'FontSetter', label: '样式' }],
  },
  {
    key: 'yAxis',
    title: 'Y 轴',
    icon: Grid3x3,
    defaultOpen: false,
    enableToggle: { path: 'showYAxis' },
    fields: [
      { path: 'yAxisFont', setter: 'FontSetter', label: '样式' },
      { path: 'showYGrid', setter: 'BooleanSetter', label: '显示网格线' },
    ],
  },
  {
    key: 'series',
    title: '系列',
    icon: Activity,
    defaultOpen: true,
    fields: [
      {
        path: 'lineWidth',
        setter: 'SliderSetter',
        label: '统一线宽',
        setterProps: { min: 1, max: 8, step: 1, unit: 'px' },
      },
      {
        path: 'series',
        setter: 'SeriesListSetter',
        label: '列表',
      },
    ],
  },
  {
    key: 'labels',
    title: '数据标签',
    icon: Hash,
    defaultOpen: false,
    enableToggle: { path: 'showLabels' },
    fields: [{ path: 'labelFont', setter: 'FontSetter', label: '样式' }],
  },
  {
    key: 'theme',
    title: '主题与预设',
    icon: Palette,
    defaultOpen: false,
    description: '把当前样式保存为预设，下次新建组件一键套用。',
    fields: [],
  },
]
