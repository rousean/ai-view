import { z } from 'zod'
import { ExtensionsSchema, PointSchema } from './common'

export const LayoutSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotate: z.number(),
  flipX: z.boolean(),
  flipY: z.boolean(),
  opacity: z.number().min(0).max(1),
})

export const WidgetFlagsSchema = z.object({
  locked: z.boolean(),
  hidden: z.boolean(),
})

export const TransformStepSchema = z.object({
  id: z.string(),
  type: z.string(),
  enabled: z.boolean(),
  params: z.record(z.unknown()),
})

export const DataBindingSchema = z.object({
  sourceId: z.string(),
  mapping: z.record(z.string()),
  transform: z.array(TransformStepSchema).optional(),
  mock: z
    .object({
      enabled: z.boolean(),
      data: z.array(z.unknown()),
    })
    .optional(),
})

export const EventBindingSchema = z.object({
  id: z.string(),
  trigger: z.string(),
  action: z.object({
    type: z.string(),
    params: z.record(z.unknown()),
  }),
  enabled: z.boolean(),
})

export const AnimationConfigSchema = z.object({
  enter: z
    .object({
      type: z.string(),
      duration: z.number(),
      delay: z.number(),
      easing: z.string(),
    })
    .optional(),
  update: z
    .object({
      type: z.string(),
      duration: z.number(),
    })
    .optional(),
  keyframes: z.unknown().optional(),
})

export const WidgetNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  layout: LayoutSchema,
  flags: WidgetFlagsSchema,
  /** Type-specific; not validated here. WidgetMeta does it. */
  props: z.record(z.unknown()),
  dataBinding: DataBindingSchema.optional(),
  events: z.array(EventBindingSchema).optional(),
  animation: AnimationConfigSchema.optional(),
  groupId: z.string().optional(),
  parentId: z.string().optional(),
  extensions: ExtensionsSchema,
})

export const ResizeHandleSchema = z.enum([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'top',
  'right',
  'bottom',
  'left',
])

export const ResizeInfoSchema = z.object({
  handle: ResizeHandleSchema,
  initialLayout: LayoutSchema,
  pointerStart: PointSchema,
  pointerCurrent: PointSchema,
  shift: z.boolean(),
  alt: z.boolean(),
})
