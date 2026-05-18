import { z } from 'zod'

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const SizeSchema = z.object({
  width: z.number(),
  height: z.number(),
})

export const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
})

export const GradientStopSchema = z.object({
  offset: z.number(),
  color: z.string(),
})

export const GradientConfigSchema = z.object({
  type: z.enum(['linear', 'radial']),
  angle: z.number().optional(),
  stops: z.array(GradientStopSchema),
})

export const BackgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('color'), color: z.string() }),
  z.object({ type: z.literal('gradient'), gradient: GradientConfigSchema }),
  z.object({
    type: z.literal('image'),
    assetId: z.string(),
    fit: z.enum(['cover', 'contain', 'fill']),
  }),
  z.object({ type: z.literal('transparent') }),
])

/** Plugin-private namespace — accept anything. */
export const ExtensionsSchema = z.record(z.unknown())
