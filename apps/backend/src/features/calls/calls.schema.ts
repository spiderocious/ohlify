import { z } from 'zod';

export const ListCallsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z
      .enum([
        'scheduled',
        'waiting_for_parties',
        'in_progress',
        'completed',
        'no_show_caller',
        'no_show_callee',
        'no_show_both',
        'disconnected_caller',
        'disconnected_callee',
      ])
      .optional(),
  })
  .strict();

export type ListCallsQueryDto = z.infer<typeof ListCallsQuerySchema>;
