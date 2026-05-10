import { z } from 'zod';

const SubjectRoleEnum = z.enum(['professional', 'caller']);
const ReasonEnum = z.enum([
  'no_show',
  'late_cancel',
  'mid_call_quit',
  'caller_no_show',
  'caller_disconnect',
]);

export const ListStrikesQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(['active', 'disputed', 'upheld', 'voided']).optional(),
    subject_role: SubjectRoleEnum.optional(),
  })
  .strict();

export const DisputeStrikeSchema = z
  .object({
    comment: z.string().min(1).max(2000),
  })
  .strict();

export const AdminListStrikesQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(['active', 'disputed', 'upheld', 'voided']).optional(),
    subject_user_id: z.string().min(1).max(64).optional(),
    subject_role: SubjectRoleEnum.optional(),
    reason_code: ReasonEnum.optional(),
  })
  .strict();

export const AdminUpholdStrikeSchema = z
  .object({
    comment: z.string().max(2000).optional(),
  })
  .strict();

export const AdminVoidStrikeSchema = z
  .object({
    reason: z.string().min(1).max(2000),
  })
  .strict();

// Admin-issued strike (manual moderation, e.g. abusive support ticket,
// payment fraud). Reason must match its role's side — pro-side reasons
// can only be issued against subject_role='professional', caller-side
// reasons against subject_role='caller'. Validation runs in the service
// after Zod parses the shape. The `description` is admin-authored
// context (free-form, required) and is stored on the strike row.
export const AdminIssueStrikeSchema = z
  .object({
    subject_user_id: z.string().min(1).max(64),
    subject_role: z.enum(['professional', 'caller']),
    reason_code: z.enum([
      'no_show',
      'late_cancel',
      'mid_call_quit',
      'caller_no_show',
      'caller_disconnect',
    ]),
    description: z.string().min(1).max(2000),
    related_call_id: z.string().min(1).max(64).optional(),
    related_booking_id: z.string().min(1).max(64).optional(),
    related_report_id: z.string().min(1).max(64).optional(),
  })
  .strict();

export type ListStrikesQueryDto = z.infer<typeof ListStrikesQuerySchema>;
export type DisputeStrikeDto = z.infer<typeof DisputeStrikeSchema>;
export type AdminListStrikesQueryDto = z.infer<typeof AdminListStrikesQuerySchema>;
export type AdminUpholdStrikeDto = z.infer<typeof AdminUpholdStrikeSchema>;
export type AdminVoidStrikeDto = z.infer<typeof AdminVoidStrikeSchema>;
export type AdminIssueStrikeDto = z.infer<typeof AdminIssueStrikeSchema>;
