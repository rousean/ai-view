import { z } from 'zod'

export const GuideSchema = z.object({
  id: z.string(),
  orientation: z.enum(['horizontal', 'vertical']),
  position: z.number(),
  locked: z.boolean().optional(),
})
