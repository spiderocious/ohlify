import { z } from 'zod';

export const ListQuerySchema = z
  .object({
    q: z.string().min(1).max(100).optional(),
    category: z.string().min(1).max(60).optional(),
    sort: z.enum(['rating', 'price', 'name']).optional(),
    direction: z.enum(['asc', 'desc']).optional(),
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export const ReviewsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

// Validates `YYYY-MM-DD` is a real calendar date — rejects 2026-13-01,
// 2026-04-31, 2026-02-30. The regex check fails first for shape, then
// `isValidYmd` confirms the day exists in the month.
const isValidYmd = (s: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  // Date.UTC normalizes overflow (Feb 30 → Mar 2) so we compare components back.
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
};

const ymdField = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be ISO date (YYYY-MM-DD)`)
    .refine(isValidYmd, { message: `${label} must be a valid calendar date` });

export const AvailabilityQuerySchema = z
  .object({
    from: ymdField('from').optional(),
    to: ymdField('to').optional(),
    call_type: z.enum(['audio', 'video']).optional(),
    duration_minutes: z.coerce.number().int().positive().optional(),
    tz: z.string().min(2).max(64).optional(),
  })
  .strict();

export const ProfessionalIdParamSchema = z.object({
  id: z.string().regex(/^u_[a-z0-9]+$/, 'Invalid professional id'),
});

export type ListQueryDto = z.infer<typeof ListQuerySchema>;
export type ReviewsQueryDto = z.infer<typeof ReviewsQuerySchema>;
export type AvailabilityQueryDto = z.infer<typeof AvailabilityQuerySchema>;
