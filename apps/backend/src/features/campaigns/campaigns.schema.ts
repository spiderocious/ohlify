import { z } from 'zod';

/**
 * Segment predicate. Loosely typed on purpose — an unknown key is ignored by
 * the compiler rather than rejected, so a newer admin build can send a
 * predicate this server merely does not narrow on.
 */
export const SegmentPredicateSchema = z
  .object({
    role: z.enum(['client', 'professional']).optional(),
    kyc_status: z.string().max(32).optional(),
    platform: z.array(z.enum(['ios', 'android', 'web'])).optional(),
    account_age_max_days: z.number().int().min(0).max(3650).optional(),
    account_age_min_days: z.number().int().min(0).max(3650).optional(),
    min_balance_kobo: z.number().int().min(0).optional(),
    max_balance_kobo: z.number().int().min(0).optional(),
    app_version_below: z.string().max(32).optional(),
  })
  .strict();

export const CreateCampaignSchema = z
  .object({
    title: z.string().min(1).max(120),
    body: z.string().max(2000).optional(),
    deeplink: z.string().max(512).optional(),
    segment: SegmentPredicateSchema.optional(),
  })
  .strict();

export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;
