import {
  ExternalLink,
  Filter,
  MousePointerClick,
  MousePointer2,
  Pointer,
  Sparkles,
  Workflow,
} from 'lucide-react'
import type { ActionDef, InteractionRegistry, TriggerDef } from './interaction-types'

/**
 * Built-in trigger catalogue. Covers the gestures dashboards typically
 * need; chart-specific triggers (legend click, slice click) come from
 * widget plugins later.
 */
export const BUILTIN_TRIGGERS: TriggerDef[] = [
  {
    type: 'click',
    label: '点击',
    description: '用户单击组件时触发',
    icon: MousePointerClick,
  },
  {
    type: 'dblclick',
    label: '双击',
    description: '用户双击组件时触发',
    icon: MousePointer2,
  },
  {
    type: 'hover',
    label: '悬停',
    description: '鼠标进入组件区域时触发',
    icon: Pointer,
  },
]

/**
 * Built-in action catalogue. Each action declares its `params` schema —
 * the EventBinding editor renders that schema using regular setters so
 * authors don't write bespoke forms.
 */
export const BUILTIN_ACTIONS: ActionDef[] = [
  {
    type: 'openUrl',
    label: '打开链接',
    description: '在新标签页或当前页打开 URL',
    icon: ExternalLink,
    params: [
      {
        key: 'url',
        label: '链接',
        setter: 'StringSetter',
        setterProps: { placeholder: 'https://...' },
        defaultValue: '',
      },
      {
        key: 'newTab',
        label: '新标签页',
        setter: 'BooleanSetter',
        defaultValue: true,
      },
    ],
  },
  {
    type: 'filter',
    label: '过滤其它组件',
    description: '将本次点击的值作为筛选条件，应用到联动组件',
    icon: Filter,
    params: [
      {
        key: 'targetWidgetId',
        label: '目标组件',
        // WidgetSelectorSetter shows the page's widgets in a dropdown;
        // the editor's own widget is greyed out (self-filter is rare,
        // and almost always a typo when it appears in muscle-memory).
        setter: 'WidgetSelectorSetter',
        defaultValue: '',
      },
      {
        key: 'field',
        label: '过滤字段',
        setter: 'StringSetter',
        setterProps: { placeholder: '如：category' },
        defaultValue: '',
      },
    ],
  },
  {
    type: 'highlight',
    label: '高亮强调',
    description: '在画布中临时强调一组组件',
    icon: Sparkles,
    params: [
      {
        key: 'targetWidgetIds',
        label: '目标组件',
        // Multi-select variant — returns string[] so the action sees a
        // ready-to-iterate list. Replaces the old comma-separated string.
        setter: 'WidgetSelectorSetter',
        setterProps: { multiple: true },
        defaultValue: [],
      },
      {
        key: 'durationMs',
        label: '持续时长',
        setter: 'SliderSetter',
        setterProps: { min: 200, max: 5000, step: 100, unit: 'ms' },
        defaultValue: 800,
      },
    ],
  },
  {
    type: 'navigatePage',
    label: '跳转页面',
    description: '切换到本大屏的另一页',
    icon: Workflow,
    params: [
      {
        key: 'pageId',
        label: '目标页面',
        setter: 'PageSelectorSetter',
        defaultValue: '',
      },
    ],
  },
]

export const BUILTIN_INTERACTION_REGISTRY: InteractionRegistry = {
  triggers: BUILTIN_TRIGGERS,
  actions: BUILTIN_ACTIONS,
}

/** Convenience lookups so the UI doesn't keep recomputing them. */
export function findTrigger(type: string) {
  return BUILTIN_TRIGGERS.find((t) => t.type === type)
}
export function findAction(type: string) {
  return BUILTIN_ACTIONS.find((a) => a.type === type)
}
