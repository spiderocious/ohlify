import { z } from 'zod';

// Admin write schemas — gated by requireAdmin middleware.

export const ManualJournalLineSchema = z
  .object({
    account_id: z.string().min(1).max(120),
    signed_amount_kobo: z.number().int(),
    currency: z.string().min(1).max(8).optional(),
  })
  .strict();

export const ManualJournalSchema = z
  .object({
    note: z.string().min(1).max(2000),
    lines: z.array(ManualJournalLineSchema).min(2).max(20),
    related_user_id: z.string().min(1).max(64).optional(),
    related_call_id: z.string().min(1).max(64).optional(),
    idempotency_key: z.string().min(1).max(120).optional(),
  })
  .strict();

export const AdminCreditSchema = z
  .object({
    user_id: z.string().min(1).max(64),
    amount_kobo: z.number().int().positive(),
    reason: z.string().min(1).max(1000),
    idempotency_key: z.string().min(1).max(120).optional(),
  })
  .strict();

export const AdminDebitSchema = AdminCreditSchema;

export const AdminApproveRefundSchema = z
  .object({
    note: z.string().max(2000).optional(),
  })
  .strict();

export const AdminRejectRefundSchema = z
  .object({
    note: z.string().min(1).max(2000),
  })
  .strict();

export const AdminListRefundsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(['pending', 'approved', 'auto_approved', 'rejected']).optional(),
  })
  .strict();

export const AdminListWithdrawalsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'reversed']).optional(),
    user_id: z.string().min(1).max(64).optional(),
  })
  .strict();

export const AdminForceFailWithdrawalSchema = z
  .object({
    reason: z.string().min(1).max(1000),
  })
  .strict();

export const AdminReplayWebhookSchema = z
  .object({
    webhook_id: z.string().min(1).max(120),
  })
  .strict();

export type ManualJournalDto = z.infer<typeof ManualJournalSchema>;
export type AdminCreditDto = z.infer<typeof AdminCreditSchema>;
export type AdminDebitDto = z.infer<typeof AdminDebitSchema>;
export type AdminApproveRefundDto = z.infer<typeof AdminApproveRefundSchema>;
export type AdminRejectRefundDto = z.infer<typeof AdminRejectRefundSchema>;
export type AdminListRefundsQueryDto = z.infer<typeof AdminListRefundsQuerySchema>;
export type AdminListWithdrawalsQueryDto = z.infer<typeof AdminListWithdrawalsQuerySchema>;
export type AdminForceFailWithdrawalDto = z.infer<typeof AdminForceFailWithdrawalSchema>;
export type AdminReplayWebhookDto = z.infer<typeof AdminReplayWebhookSchema>;
