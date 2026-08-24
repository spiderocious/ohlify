import { z } from 'zod';

export const ListAccountsQuerySchema = z
  .object({
    kind: z.enum(['user', 'system', 'liability', 'all']).optional(),
  })
  .strict();

export const ListJournalsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    kind: z.string().min(1).max(64).optional(),
    user_id: z.string().min(1).max(64).optional(),
    call_id: z.string().min(1).max(64).optional(),
  })
  .strict();

export const ListWebhooksQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export const SummaryWindowQuerySchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be ISO date (YYYY-MM-DD)')
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be ISO date (YYYY-MM-DD)')
      .optional(),
  })
  .strict();

/**
 * The dashboards' only input.
 *
 * A named range rather than free `from`/`to`: both boards compare a period
 * against the one immediately before it, and that comparison is only
 * meaningful when the two windows are the same length. Accepting arbitrary
 * dates would let a caller ask for a three-day window compared against
 * ninety, and the delta badges would quietly lie.
 *
 * Defaulted, so the endpoint is callable with no query at all.
 */
export const AdminDashboardQuerySchema = z
  .object({
    range: z.enum(['today', '7d', '30d', '90d']).default('7d'),
  })
  .strict();

export type AdminDashboardQueryDto = z.infer<typeof AdminDashboardQuerySchema>;

export type ListAccountsQueryDto = z.infer<typeof ListAccountsQuerySchema>;
export type ListJournalsQueryDto = z.infer<typeof ListJournalsQuerySchema>;
export type ListWebhooksQueryDto = z.infer<typeof ListWebhooksQuerySchema>;
export type SummaryWindowQueryDto = z.infer<typeof SummaryWindowQuerySchema>;
