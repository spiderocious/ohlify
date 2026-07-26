import { z } from 'zod';

const audienceEnum = z.enum(['all', 'clients', 'professionals']);
const placementEnum = z.enum(['home_top', 'home_inline', 'web_landing']);

// body_blocks holds the shared `ContentBlock` discriminated union from
// shared/types/content-block.ts. We don't re-validate the union here
// (zod schemas would be duplicated and drift) — the column is JSONB so
// the only invariant the API enforces is array-shaped + reasonable size.
import { SegmentPredicateSchema } from '@features/campaigns/campaigns.schema.js';

// Block-shape validation lives in the renderer (mobile) + the existing
// content-block POJO type.
const contentBlockArray = z.array(z.unknown()).max(200);

export const CreateBannerSchema = z
  .object({
    title: z.string().min(1).max(200),
    subtitle: z.string().max(200).optional(),
    body: z.string().max(2000).optional(),
    body_blocks: contentBlockArray.optional(),
    image_url: z.string().url().max(2048).optional(),
    cta_label: z.string().max(80).optional(),
    cta_url: z.string().url().max(2048).optional(),
    deeplink: z.string().max(2048).optional(),
    audience: audienceEnum.optional(),
    placement: placementEnum,
    priority: z.number().int().min(0).max(1000).optional(),
    is_active: z.boolean().optional(),
    starts_at: z.string().datetime().optional(),
    // Mandatory since revamp-2. An immortal banner is nearly always an
    // authoring mistake, and it is what produces "Christmas giveaway seen on
    // the 31st". The column is NOT NULL, so an omitted value would 500 here.
    ends_at: z.string().datetime(),
    /** Shows once per user, then falls through to the next target tier. */
    view_once: z.boolean().optional(),
    /** Who sees it. Absent means everyone. */
    target: z
      .discriminatedUnion('kind', [
        z.object({ kind: z.literal('all') }).strict(),
        z.object({ kind: z.literal('user'), user_ids: z.array(z.string().min(1)).min(1) }).strict(),
        z.object({ kind: z.literal('segment'), segment: SegmentPredicateSchema }).strict(),
      ])
      .optional(),
  })
  .strict();

// PATCH allows every field to be omitted (partial), but `placement` and
// `title` cannot be set to null/empty if supplied.
export const UpdateBannerSchema = CreateBannerSchema.partial();

export const ListBannersAdminQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    audience: audienceEnum.optional(),
    placement: placementEnum.optional(),
    is_active: z.coerce.boolean().optional(),
  })
  .strict();

export const ListBannersPublicQuerySchema = z
  .object({
    audience: audienceEnum.optional(),
    placement: placementEnum.optional(),
  })
  .strict();

export type CreateBannerDto = z.infer<typeof CreateBannerSchema>;
export type UpdateBannerDto = z.infer<typeof UpdateBannerSchema>;
export type ListBannersAdminQueryDto = z.infer<typeof ListBannersAdminQuerySchema>;
export type ListBannersPublicQueryDto = z.infer<typeof ListBannersPublicQuerySchema>;
