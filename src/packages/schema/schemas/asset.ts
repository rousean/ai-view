import { z } from 'zod'
import { ExtensionsSchema } from './common'

export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  size: z.number().optional(),
  duration: z.number().optional(),
  extensions: ExtensionsSchema,
})
