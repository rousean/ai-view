import { z } from 'zod'
import { Square } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { RectComponent } from './component'
import { DEFAULT_RECT_PROPS } from './default-props'
import { RectPreview } from './preview'
import { RECT_PROPS_GROUPS } from './props-config'
import type { RectProps } from './types'

const RectPropsSchema = z.object({
  fill: z.string(),
  borderColor: z.string(),
  borderWidth: z.number(),
  radius: z.number(),
})

export const rectMeta: WidgetMeta<RectProps> = {
  type: 'rect',
  version: '1.0.0',
  category: 'decoration',
  title: '矩形',
  description: '色块 / 背景面板 / 分隔条',
  icon: Square,
  tags: ['矩形', '形状', '面板', 'rect', 'shape', '装饰', '色块'],

  defaultProps: DEFAULT_RECT_PROPS,
  defaultLayout: { width: 200, height: 120 },
  defaultName: (i) => `矩形 ${i + 1}`,

  propsSchema: RectPropsSchema,
  propsGroups: RECT_PROPS_GROUPS,

  // No `dataSchema`: pure decoration.

  Component: RectComponent,
  Preview: RectPreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 8, height: 8 },
  },
}

export default rectMeta
export type { RectProps }
