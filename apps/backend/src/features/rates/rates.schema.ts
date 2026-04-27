import { z } from 'zod';

const callType = z.enum(['audio', 'video']);

export const CreateRateSchema = z
  .object({
    call_type: callType,
    duration_minutes: z.number().int().positive(),
    price_kobo: z.number().int().positive(),
  })
  .strict();

export const UpdateRateSchema = z
  .object({
    call_type: callType.optional(),
    duration_minutes: z.number().int().positive().optional(),
    price_kobo: z.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.call_type !== undefined || v.duration_minutes !== undefined || v.price_kobo !== undefined,
    { message: 'At least one of call_type, duration_minutes, price_kobo is required' },
  );

export const RateIdParamSchema = z.object({
  id: z.string().regex(/^rate_[a-z0-9]+$/, 'Invalid rate id'),
});

export type CreateRateDto = z.infer<typeof CreateRateSchema>;
export type UpdateRateDto = z.infer<typeof UpdateRateSchema>;
