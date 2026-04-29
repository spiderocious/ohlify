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

export const AdminListAuditLogQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    admin_user_id: z.string().min(1).max(64).optional(),
    action: z.string().min(1).max(120).optional(),
    target_type: z.string().min(1).max(64).optional(),
    target_id: z.string().min(1).max(64).optional(),
  })
  .strict();

export type AdminListAuditLogQueryDto = z.infer<typeof AdminListAuditLogQuerySchema>;

// Admin config: PATCH allows partial updates to platform_config rows. Each
// key is one row in platform_config; the value is JSON. We accept an
// arbitrary object and write each key as a separate row update.
export const AdminPatchConfigSchema = z
  .object({
    updates: z
      .array(
        z
          .object({
            key: z.string().min(1).max(120),
            value: z.unknown(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    note: z.string().min(1).max(2000),
  })
  .strict();

export type AdminPatchConfigDto = z.infer<typeof AdminPatchConfigSchema>;

// ── Admin users ───────────────────────────────────────────────────────────

export const AdminListUsersQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    role: z.enum(['client', 'professional']).optional(),
    status: z.enum(['active', 'suspended', 'blocked']).optional(),
    kyc_status: z.enum(['none', 'pending', 'approved', 'rejected']).optional(),
    q: z.string().min(1).max(120).optional(),
  })
  .strict();

export const AdminSuspendUserSchema = z
  .object({
    reason: z.string().min(1).max(2000),
    until: z.string().datetime().optional(),
  })
  .strict();

export const AdminBlockUserSchema = z
  .object({
    reason: z.string().min(1).max(2000),
  })
  .strict();

export const AdminUnsuspendUserSchema = z
  .object({
    note: z.string().max(2000).optional(),
  })
  .strict();

// Admin-driven password reset. Two paths:
//   - send_email = true: ignore new_password, generate a reset token + email link.
//   - send_email = false: set new_password directly (used for break-glass ops).
export const AdminResetPasswordSchema = z
  .object({
    send_email: z.boolean(),
    new_password: z.string().min(8).max(200).optional(),
    note: z.string().min(1).max(2000),
  })
  .strict()
  .refine((v) => v.send_email || (!v.send_email && v.new_password), {
    message: 'new_password required when send_email is false',
    path: ['new_password'],
  });

export const AdminImpersonateUserSchema = z
  .object({
    reason: z.string().min(1).max(2000),
    duration_minutes: z.number().int().min(1).max(60).optional(),
  })
  .strict();

export type AdminListUsersQueryDto = z.infer<typeof AdminListUsersQuerySchema>;
export type AdminSuspendUserDto = z.infer<typeof AdminSuspendUserSchema>;
export type AdminBlockUserDto = z.infer<typeof AdminBlockUserSchema>;
export type AdminUnsuspendUserDto = z.infer<typeof AdminUnsuspendUserSchema>;
export type AdminResetPasswordDto = z.infer<typeof AdminResetPasswordSchema>;
export type AdminImpersonateUserDto = z.infer<typeof AdminImpersonateUserSchema>;

// ── Admin KYC ──────────────────────────────────────────────────────────────

export const AdminListKycQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['none', 'pending_review', 'approved', 'rejected']).optional(),
  })
  .strict();

export const AdminApproveKycSchema = z
  .object({
    note: z.string().max(2000).optional(),
  })
  .strict();

export const AdminRejectKycSchema = z
  .object({
    reason_code: z.enum([
      'document_unclear',
      'identity_mismatch',
      'expired_document',
      'fraudulent',
      'other',
    ]),
    note: z.string().min(1).max(2000),
  })
  .strict();

export type AdminListKycQueryDto = z.infer<typeof AdminListKycQuerySchema>;
export type AdminApproveKycDto = z.infer<typeof AdminApproveKycSchema>;
export type AdminRejectKycDto = z.infer<typeof AdminRejectKycSchema>;

// ── Admin reports ─────────────────────────────────────────────────────────

export const AdminListReportsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['pending', 'resolved', 'dismissed']).optional(),
    target_type: z.enum(['review', 'profile', 'message']).optional(),
    target_id: z.string().min(1).max(64).optional(),
  })
  .strict();

export const AdminResolveReportSchema = z
  .object({
    note: z.string().min(1).max(2000),
  })
  .strict();

export const AdminDismissReportSchema = z
  .object({
    note: z.string().min(1).max(2000),
  })
  .strict();

export type AdminListReportsQueryDto = z.infer<typeof AdminListReportsQuerySchema>;
export type AdminResolveReportDto = z.infer<typeof AdminResolveReportSchema>;
export type AdminDismissReportDto = z.infer<typeof AdminDismissReportSchema>;

// ── Admin content: legal + FAQs ───────────────────────────────────────────

const ContentBlockShape = z.unknown();

export const AdminPublishLegalSchema = z
  .object({
    version: z.string().min(1).max(40),
    content_markdown: z.string().min(1).max(200_000).optional(),
    blocks: z.array(ContentBlockShape).max(500).optional(),
  })
  .strict()
  .refine((v) => v.content_markdown !== undefined || (v.blocks && v.blocks.length > 0), {
    message: 'Either content_markdown or non-empty blocks is required',
    path: ['content_markdown'],
  });

export const AdminCreateFaqSchema = z
  .object({
    question: z.string().min(1).max(500),
    answer: z.string().min(1).max(50_000),
    blocks: z.array(ContentBlockShape).max(200).optional(),
    sort_order: z.number().int().min(0).max(10_000).optional(),
    is_published: z.boolean().optional(),
  })
  .strict();

export const AdminUpdateFaqSchema = AdminCreateFaqSchema.partial();

export type AdminPublishLegalDto = z.infer<typeof AdminPublishLegalSchema>;
export type AdminCreateFaqDto = z.infer<typeof AdminCreateFaqSchema>;
export type AdminUpdateFaqDto = z.infer<typeof AdminUpdateFaqSchema>;
