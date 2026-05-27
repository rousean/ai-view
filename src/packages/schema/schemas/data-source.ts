import { z } from 'zod'
import { ExtensionsSchema, FieldDefSchema } from './common'
import { TransformStepSchema } from './widget-node'

// NB: `FieldDefSchema` moved to ./common (inline widget data also uses
// it). Import it from there.

const DataSourceBaseShape = {
  id: z.string(),
  name: z.string(),
  type: z.string(),
  schema: z
    .object({
      fields: z.array(FieldDefSchema),
    })
    .optional(),
  transform: z.array(TransformStepSchema).optional(),
  cache: z
    .object({
      enabled: z.boolean(),
      ttl: z.number().optional(),
    })
    .optional(),
  extensions: ExtensionsSchema,
}

/**
 * Permissive DataSource schema: accepts any `type`, plus any extra fields.
 * Concrete validation per-type is performed by the DataSourceTypeRegistry.
 */
export const DataSourceSchema = z.object(DataSourceBaseShape).catchall(z.unknown())
