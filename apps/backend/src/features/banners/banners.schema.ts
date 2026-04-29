import { z } from 'zod';

const audienceEnum = z.enum(['all', 'clients', 'professionals']);

export const CreateBannerSchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().max(2000).optional(),
    image_url: z.string().url().max(2048).optional(),
    cta_label: z.string().max(80).optional(),
    cta_url: z.string().url().max(2048).optional(),
    audience: audienceEnum.optional(),
    priority: z.number().int().min(0).max(1000).optional(),
    is_active: z.boolean().optional(),
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().optional(),
  })
  .strict();

export const UpdateBannerSchema = CreateBannerSchema.partial();

export const ListBannersAdminQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    audience: audienceEnum.optional(),
    is_active: z.coerce.boolean().optional(),
  })
  .strict();

export const ListBannersPublicQuerySchema = z
  .object({
    audience: audienceEnum.optional(),
  })
  .strict();

export type CreateBannerDto = z.infer<typeof CreateBannerSchema>;
export type UpdateBannerDto = z.infer<typeof UpdateBannerSchema>;
export type ListBannersAdminQueryDto = z.infer<typeof ListBannersAdminQuerySchema>;
export type ListBannersPublicQueryDto = z.infer<typeof ListBannersPublicQuerySchema>;
