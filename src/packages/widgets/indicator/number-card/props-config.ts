import { AlignLeft, Hash, Palette, Tag, Zap } from 'lucide-react'
import type { PropGroupDef } from '../../widget-meta'

/** Property-panel config for the Number / KPI card. */
export const NUMBER_CARD_PROPS_GROUPS: PropGroupDef[] = [
  {
    key: 'value',
    title: '数值',
    icon: Hash,
    defaultOpen: true,
    fields: [
      {
        path: 'aggregate',
        setter: 'SelectSetter',
        label: '聚合方式',
        setterProps: {
          options: [
            { value: 'sum', label: '求和' },
            { value: 'avg', label: '平均' },
            { value: 'max', label: '最大值' },
            { value: 'min', label: '最小值' },
            { value: 'last', label: '最新值' },
            { value: 'first', label: '最早值' },
            { value: 'count', label: '计数' },
          ],
        },
      },
      {
        path: 'decimals',
        setter: 'SliderSetter',
        label: '小数位',
        setterProps: { min: 0, max: 4, step: 1 },
      },
      { path: 'thousands', setter: 'BooleanSetter', label: '千分位' },
      { path: 'prefix', setter: 'StringSetter', label: '前缀', setterProps: { placeholder: '如 ¥' } },
      { path: 'suffix', setter: 'StringSetter', label: '后缀', setterProps: { placeholder: '如 万 / %' } },
      { path: 'valueFont', setter: 'FontSetter', label: '样式' },
    ],
  },
  {
    key: 'label',
    title: '标签',
    icon: Tag,
    defaultOpen: true,
    enableToggle: { path: 'showLabel' },
    fields: [
      { path: 'label', setter: 'StringSetter', label: '文字', setterProps: { placeholder: '指标名称' } },
      { path: 'labelFont', setter: 'FontSetter', label: '样式' },
      {
        path: 'labelPosition',
        setter: 'SelectSetter',
        label: '位置',
        setterProps: {
          options: [
            { value: 'top', label: '数字上方' },
            { value: 'bottom', label: '数字下方' },
          ],
        },
      },
    ],
  },
  {
    key: 'box',
    title: '排版与背景',
    icon: AlignLeft,
    defaultOpen: false,
    fields: [
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
    key: 'rules',
    title: '条件格式',
    icon: Zap,
    defaultOpen: false,
    description: '按数值阈值给数字上色（如低于目标变红）。',
    fields: [{ path: 'rules', setter: 'RulesSetter', label: '规则' }],
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
