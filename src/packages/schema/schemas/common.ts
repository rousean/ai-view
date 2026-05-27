import { z } from 'zod'

export const FieldTypeSchema = z.enum(['string', 'number', 'date', 'boolean'])

export const FieldDefSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  label: z.string().optional(),
})

/**
 * Lightweight self-describing dataset. Rows are loose `Record<string, unknown>`
 * — we don't deep-validate cell types at the zod layer; the table editor
 * (and source fetchers) own that, and stronger validation would reject
 * partial / in-flight edits.
 */
export const DatasetSchema = z.object({
  fields: z.array(FieldDefSchema),
  rows: z.array(z.record(z.unknown())),
})

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
