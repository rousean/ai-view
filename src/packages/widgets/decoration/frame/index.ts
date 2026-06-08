import { z } from 'zod'
import { Frame } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { FrameComponent } from './component'
import { DEFAULT_FRAME_PROPS } from './default-props'
import { FramePreview } from './preview'
import { FRAME_PROPS_GROUPS } from './props-config'
import type { FrameProps } from './types'

const FramePropsSchema = z.object({
  color: z.string(),
  showBorder: z.boolean(),
  borderWidth: z.number(),
  fill: z.string(),
  radius: z.number(),
  cornerLength: z.number(),
  cornerWidth: z.number(),
  glow: z.boolean(),
})

export const frameMeta: WidgetMeta<FrameProps> = {
  type: 'decoration-frame',
  version: '1.0.0',
  category: 'decoration',
  title: '装饰边框',
  description: '科技感边框 + 四角角标',
  icon: Frame,
  tags: ['边框', '边框装饰', 'frame', 'border', '角标', '装饰'],

  defaultProps: DEFAULT_FRAME_PROPS,
  defaultLayout: { width: 320, height: 200 },
  defaultName: (i) => `装饰边框 ${i + 1}`,

  propsSchema: FramePropsSchema,
  propsGroups: FRAME_PROPS_GROUPS,

  Component: FrameComponent,
  Preview: FramePreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 40, height: 40 },
  },
}

export default frameMeta
export type { FrameProps }
