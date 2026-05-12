import { z } from 'zod';

export const ReferenceParamSchema = z.object({
  reference: z.string().min(8).max(120),
});
