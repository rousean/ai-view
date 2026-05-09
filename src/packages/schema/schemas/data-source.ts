import { z } from 'zod';
import { ExtensionsSchema } from './common';
import { TransformStepSchema } from './widget-node';

export const FieldDefSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'date', 'boolean']),
  label: z.string().optional(),
});

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
};

/**
 * Permissive DataSource schema: accepts any `type`, plus any extra fields.
 * Concrete validation per-type is performed by the DataSourceTypeRegistry.
 */
export const DataSourceSchema = z
  .object(DataSourceBaseShape)
  .catchall(z.unknown());
