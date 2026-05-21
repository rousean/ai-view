import { z } from 'zod'
import { AssetSchema } from './asset'
import { ExtensionsSchema } from './common'
import { DataSourceSchema } from './data-source'
import { PageSchema } from './page'

export const ProjectSchema = z.object({
  version: z.string(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(['published', 'draft', 'review', 'archived']).optional(),
  pages: z.array(PageSchema).min(1),
  currentPageId: z.string(),
  dataSources: z.array(DataSourceSchema),
  assets: z.array(AssetSchema),
  extensions: ExtensionsSchema,
})

export const ProjectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  updatedAt: z.string(),
})
