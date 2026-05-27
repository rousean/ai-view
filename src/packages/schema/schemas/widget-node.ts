import { z } from 'zod'
import { DatasetSchema, ExtensionsSchema, PointSchema } from './common'

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

/** Slot column mapping — slot name → single column or array of columns. */
export const SlotMappingSchema = z.record(z.union([z.string(), z.array(z.string())]))

/** Widget-attached data: inline (dataset owned by widget) | bound (DataSource). */
export const WidgetDataSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('inline'),
    dataset: DatasetSchema,
    mapping: SlotMappingSchema,
    transform: z.array(TransformStepSchema).optional(),
  }),
  z.object({
    mode: z.literal('bound'),
    sourceId: z.string(),
    mapping: SlotMappingSchema,
    transform: z.array(TransformStepSchema).optional(),
  }),
])

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
  data: WidgetDataSchema.optional(),
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
