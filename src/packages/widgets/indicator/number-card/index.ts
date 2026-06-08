import { z } from 'zod'
import { Hash } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { NumberCardComponent } from './component'
import { DEFAULT_NUMBER_CARD_PROPS } from './default-props'
import { NumberCardPreview } from './preview'
import { NUMBER_CARD_PROPS_GROUPS } from './props-config'
import type { NumberCardProps } from './types'

const FontStyleSchema = z.object({
  color: z.string().optional(),
  size: z.number().optional(),
  weight: z.union([z.literal('normal'), z.literal('bold'), z.number()]).optional(),
  italic: z.boolean().optional(),
})

const NumberCardPropsSchema = z.object({
  aggregate: z.union([
    z.literal('sum'),
    z.literal('avg'),
    z.literal('max'),
    z.literal('min'),
    z.literal('last'),
    z.literal('first'),
    z.literal('count'),
  ]),
  decimals: z.number(),
  thousands: z.boolean(),
  prefix: z.string(),
  suffix: z.string(),
  valueFont: FontStyleSchema,
  showLabel: z.boolean(),
  label: z.string(),
  labelFont: FontStyleSchema,
  labelPosition: z.union([z.literal('top'), z.literal('bottom')]),
  align: z.union([z.literal('left'), z.literal('center'), z.literal('right')]),
  background: z.string(),
  padding: z.number(),
})

export const numberCardMeta: WidgetMeta<NumberCardProps> = {
  type: 'number-card',
  version: '1.0.0',
  category: 'indicator',
  title: '指标卡',
  description: '突出展示一个关键数值',
  icon: Hash,
  tags: ['指标', '数字', '翻牌', 'kpi', 'number', 'metric'],

  defaultProps: DEFAULT_NUMBER_CARD_PROPS,
  defaultLayout: { width: 220, height: 120 },
  defaultName: (i) => `指标卡 ${i + 1}`,

  propsSchema: NumberCardPropsSchema,
  propsGroups: NUMBER_CARD_PROPS_GROUPS,

  // One numeric slot, reduced by `aggregate` to a single figure.
  dataSchema: {
    slots: [
      {
        name: 'value',
        label: '数值',
        role: 'measure',
        accepts: ['number'],
        cardinality: 'one',
      },
    ],
    sample: {
      fields: [{ name: '销售额', type: 'number' }],
      rows: [{ 销售额: 12800 }, { 销售额: 9600 }, { 销售额: 15300 }],
    },
  },

  Component: NumberCardComponent,
  Preview: NumberCardPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 100, height: 60 },
  },
}

export default numberCardMeta
export type { NumberCardProps }
