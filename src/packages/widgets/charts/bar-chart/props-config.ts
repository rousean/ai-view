import { BarChart3, Grid3x3, Hash, Palette, Tag, Type } from 'lucide-react'
import type { PropConfig, PropGroupDef } from '../../widget-meta'

/**
 * Legacy flat config — kept so anything that still inspects
 * `WidgetMeta.propsConfig` keeps working. New PropertyPanel reads
 * `propsGroups` first.
 */
export const BAR_CHART_PROPS_CONFIG: PropConfig[] = [
  { path: 'title', setter: 'StringSetter', label: '标题', tab: '设计' },
  { path: 'showLegend', setter: 'BooleanSetter', label: '显示图例', tab: '设计' },
  { path: 'showLabels', setter: 'BooleanSetter', label: '显示数值', tab: '设计' },
  { path: 'showXAxis', setter: 'BooleanSetter', label: '显示 X 轴', tab: '设计' },
  { path: 'showYAxis', setter: 'BooleanSetter', label: '显示 Y 轴', tab: '设计' },
  { path: 'barColor', setter: 'ColorSetter', label: '柱体颜色', tab: '设计' },
  {
    path: 'barRadius',
    setter: 'SliderSetter',
    label: '圆角',
    setterProps: { min: 0, max: 20, step: 1, unit: 'px' },
    tab: '设计',
  },
]

/**
 * Nested property-panel config for BarChart.
 *
 * Each top-level section maps to a logical part of the chart (Title /
 * Legend / X / Y / Series / DataLabels). Sections with a binary
 * "is this part visible" prop carry an `enableToggle` so the header
 * switch and the master prop are the same thing.
 *
 * FontSetter rows replace the older split colour+size pairs — saves
 * one row per axis/title/legend and keeps weight/italic in reach.
 */
export const BAR_CHART_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'title',
    title: '标题',
    icon: Type,
    enableToggle: { path: 'showTitle' },
    fields: [
      {
        path: 'title',
        setter: 'StringSetter',
        label: '文字',
        setterProps: { placeholder: '图表标题' },
      },
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
    icon: BarChart3,
    defaultOpen: true,
    fields: [
      {
        path: 'barColor',
        setter: 'ColorSetter',
        label: '柱体颜色',
      },
      {
        path: 'barRadius',
        setter: 'SliderSetter',
        label: '圆角',
        setterProps: { min: 0, max: 20, step: 1, unit: 'px' },
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
    title: '样式预设',
    icon: Palette,
    defaultOpen: false,
    description: '把当前样式保存为预设，下次新建组件一键套用。',
    fields: [],
  },
]
