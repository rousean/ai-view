import { z } from 'zod'
import { Type } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { TextComponent } from './component'
import { DEFAULT_TEXT_PROPS } from './default-props'
import { TextPreview } from './preview'
import { TEXT_PROPS_GROUPS } from './props-config'
import type { TextProps } from './types'

const FontStyleSchema = z.object({
  color: z.string().optional(),
  size: z.number().optional(),
  weight: z.union([z.literal('normal'), z.literal('bold'), z.number()]).optional(),
  italic: z.boolean().optional(),
})

const TextPropsSchema = z.object({
  content: z.string(),
  font: FontStyleSchema,
  align: z.union([z.literal('left'), z.literal('center'), z.literal('right')]),
  valign: z.union([z.literal('top'), z.literal('middle'), z.literal('bottom')]),
  lineHeight: z.number(),
  letterSpacing: z.number(),
  background: z.string(),
  padding: z.number(),
  wrap: z.boolean(),
})

export const textMeta: WidgetMeta<TextProps> = {
  type: 'text',
  version: '1.0.0',
  category: 'text',
  title: '文本',
  description: '展示标题或说明文字',
  icon: Type,
  tags: ['文本', 'text', '文字', '标题', 'label', '说明'],

  defaultProps: DEFAULT_TEXT_PROPS,
  defaultLayout: { width: 240, height: 60 },
  defaultName: (i) => `文本 ${i + 1}`,

  propsSchema: TextPropsSchema,
  propsGroups: TEXT_PROPS_GROUPS,

  // No `dataSchema`: text is a pure display widget. The resolver returns
  // empty slots and the component ignores `data` entirely.

  Component: TextComponent,
  Preview: TextPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 40, height: 24 },
  },
}

export default textMeta
export type { TextProps }
