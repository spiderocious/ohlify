import { z } from 'zod';

export const PostRatingSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    feedback_text: z.string().min(1).max(2000).optional(),
    is_public: z.boolean().optional(), // defaults true
  })
  .strict();

export const ListReviewsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    rating_min: z.coerce.number().int().min(1).max(5).optional(),
    rating_max: z.coerce.number().int().min(1).max(5).optional(),
  })
  .strict();

export const AdminListReviewsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    rating_max: z.coerce.number().int().min(1).max(5).optional(),
    flagged: z.enum(['true', 'false']).optional(),
    user_id: z.string().min(1).max(64).optional(),
    professional_id: z.string().min(1).max(64).optional(),
    only_hidden: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const AdminHideReviewSchema = z
  .object({
    reason: z.string().min(1).max(2000),
  })
  .strict();

export type PostRatingDto = z.infer<typeof PostRatingSchema>;
export type ListReviewsQueryDto = z.infer<typeof ListReviewsQuerySchema>;
export type AdminListReviewsQueryDto = z.infer<typeof AdminListReviewsQuerySchema>;
export type AdminHideReviewDto = z.infer<typeof AdminHideReviewSchema>;
