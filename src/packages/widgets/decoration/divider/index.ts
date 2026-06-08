import { z } from 'zod'
import { Minus } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { DividerComponent } from './component'
import { DEFAULT_DIVIDER_PROPS } from './default-props'
import { DividerPreview } from './preview'
import { DIVIDER_PROPS_GROUPS } from './props-config'
import type { DividerProps } from './types'

const DividerPropsSchema = z.object({
  orientation: z.union([z.literal('horizontal'), z.literal('vertical')]),
  color: z.string(),
  thickness: z.number(),
  lineStyle: z.union([z.literal('solid'), z.literal('dashed'), z.literal('dotted')]),
  glow: z.boolean(),
})

export const dividerMeta: WidgetMeta<DividerProps> = {
  type: 'divider',
  version: '1.0.0',
  category: 'decoration',
  title: '分割线',
  description: '水平 / 垂直装饰线',
  icon: Minus,
  tags: ['分割线', '线', 'divider', 'line', '装饰'],

  defaultProps: DEFAULT_DIVIDER_PROPS,
  defaultLayout: { width: 320, height: 16 },
  defaultName: (i) => `分割线 ${i + 1}`,

  propsSchema: DividerPropsSchema,
  propsGroups: DIVIDER_PROPS_GROUPS,

  Component: DividerComponent,
  Preview: DividerPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 8, height: 8 },
  },
}

export default dividerMeta
export type { DividerProps }
