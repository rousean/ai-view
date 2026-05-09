import { z } from 'zod';
import { ExtensionsSchema } from './common';

export const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokens: z.record(z.string()),
  palette: z.array(z.string()),
  echartsTheme: z.record(z.unknown()).optional(),
  extensions: ExtensionsSchema,
});
