import { z } from 'zod'
import { Image as ImageIcon } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { ImageComponent } from './component'
import { DEFAULT_IMAGE_PROPS } from './default-props'
import { ImagePreview } from './preview'
import { IMAGE_PROPS_GROUPS } from './props-config'
import type { ImageProps } from './types'

const ImagePropsSchema = z.object({
  src: z.string(),
  fit: z.union([z.literal('cover'), z.literal('contain'), z.literal('fill')]),
  radius: z.number(),
})

export const imageMeta: WidgetMeta<ImageProps> = {
  type: 'image',
  version: '1.0.0',
  category: 'media',
  title: '图片',
  description: '展示一张图片（URL 或 data 链接）',
  icon: ImageIcon,
  tags: ['图片', 'image', '图像', 'media', '媒体', 'logo'],

  defaultProps: DEFAULT_IMAGE_PROPS,
  defaultLayout: { width: 200, height: 150 },
  defaultName: (i) => `图片 ${i + 1}`,

  propsSchema: ImagePropsSchema,
  propsGroups: IMAGE_PROPS_GROUPS,

  // No `dataSchema`: pure media widget.

  Component: ImageComponent,
  Preview: ImagePreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 24, height: 24 },
  },
}

export default imageMeta
export type { ImageProps }
