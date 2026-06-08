import { z } from 'zod'
import { Clock } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { ClockComponent } from './component'
import { DEFAULT_CLOCK_PROPS } from './default-props'
import { ClockPreview } from './preview'
import { CLOCK_PROPS_GROUPS } from './props-config'
import type { ClockProps } from './types'

const FontStyleSchema = z.object({
  color: z.string().optional(),
  size: z.number().optional(),
  weight: z.union([z.literal('normal'), z.literal('bold'), z.number()]).optional(),
  italic: z.boolean().optional(),
})

const ClockPropsSchema = z.object({
  mode: z.union([z.literal('datetime'), z.literal('date'), z.literal('time')]),
  use24h: z.boolean(),
  showSeconds: z.boolean(),
  showWeekday: z.boolean(),
  dateSep: z.union([z.literal('-'), z.literal('/'), z.literal('.')]),
  font: FontStyleSchema,
  align: z.union([z.literal('left'), z.literal('center'), z.literal('right')]),
})

export const clockMeta: WidgetMeta<ClockProps> = {
  type: 'clock',
  version: '1.0.0',
  category: 'basic',
  title: '时钟',
  description: '实时日期 / 时间',
  icon: Clock,
  tags: ['时钟', '时间', '日期', 'clock', 'time', 'date'],

  defaultProps: DEFAULT_CLOCK_PROPS,
  defaultLayout: { width: 260, height: 48 },
  defaultName: (i) => `时钟 ${i + 1}`,

  propsSchema: ClockPropsSchema,
  propsGroups: CLOCK_PROPS_GROUPS,

  Component: ClockComponent,
  Preview: ClockPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 80, height: 24 },
  },
}

export default clockMeta
export type { ClockProps }
