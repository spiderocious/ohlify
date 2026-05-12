import { z } from 'zod';

export const CreateRefundRequestSchema = z
  .object({
    target_journal_id: z.string().min(8).max(120),
    reason_code: z.string().min(2).max(60),
    description: z.string().min(1).max(2000).optional(),
  })
  .strict();

export const ListRefundRequestsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(['pending', 'approved', 'auto_approved', 'rejected']).optional(),
  })
  .strict();

export const ApproveRefundSchema = z
  .object({
    note: z.string().max(2000).optional(),
  })
  .strict();

export const RejectRefundSchema = z
  .object({
    note: z.string().min(1).max(2000),
  })
  .strict();

export type CreateRefundRequestDto = z.infer<typeof CreateRefundRequestSchema>;
export type ListRefundRequestsQueryDto = z.infer<typeof ListRefundRequestsQuerySchema>;
export type ApproveRefundDto = z.infer<typeof ApproveRefundSchema>;
export type RejectRefundDto = z.infer<typeof RejectRefundSchema>;
