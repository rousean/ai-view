import { z } from 'zod'
import { BackgroundSchema, ExtensionsSchema } from './common'
import { GuideSchema } from './guide'
import { WidgetNodeSchema } from './widget-node'

export const CanvasConfigSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  orientation: z.enum(['landscape', 'portrait']),
  background: BackgroundSchema,
})

export const GridConfigSchema = z.object({
  enabled: z.boolean(),
  size: z.number().positive(),
  snap: z.boolean(),
  color: z.string().optional(),
})

export const PageTransitionSchema = z.object({
  type: z.string(),
  duration: z.number(),
  autoplay: z
    .object({
      enabled: z.boolean(),
      interval: z.number(),
    })
    .optional(),
})

export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  canvas: CanvasConfigSchema,
  grid: GridConfigSchema,
  guides: z.array(GuideSchema),
  widgets: z.array(WidgetNodeSchema),
  themeId: z.string().optional(),
  transition: PageTransitionSchema.optional(),
  extensions: ExtensionsSchema,
})
