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

export const AdminTestInitCallSchema = z
  .object({
    caller_user_id: z.string().min(1).max(64),
    callee_user_id: z.string().min(1).max(64),
    rate_id: z.string().min(1).max(64).optional(),
    start_in_seconds: z.number().int().min(0).max(86400).optional(),
  })
  .strict();

export const AdminListCallsQuerySchema = z
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
    user_id: z.string().min(1).max(64).optional(),
  })
  .strict();

export const AdminListBookingsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z
      .enum([
        'pending',
        'confirmed',
        'cancelled_outside_window',
        'cancelled_inside_window',
        'fulfilled',
      ])
      .optional(),
    user_id: z.string().min(1).max(64).optional(),
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
export type AdminTestInitCallDto = z.infer<typeof AdminTestInitCallSchema>;
export type AdminListCallsQueryDto = z.infer<typeof AdminListCallsQuerySchema>;
export type AdminListBookingsQueryDto = z.infer<typeof AdminListBookingsQuerySchema>;
