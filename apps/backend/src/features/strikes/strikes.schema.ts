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

export type ListStrikesQueryDto = z.infer<typeof ListStrikesQuerySchema>;
export type DisputeStrikeDto = z.infer<typeof DisputeStrikeSchema>;
export type AdminListStrikesQueryDto = z.infer<typeof AdminListStrikesQuerySchema>;
export type AdminUpholdStrikeDto = z.infer<typeof AdminUpholdStrikeSchema>;
export type AdminVoidStrikeDto = z.infer<typeof AdminVoidStrikeSchema>;
