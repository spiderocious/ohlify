import { z } from 'zod';

export const CreateBookingSchema = z
  .object({
    callee_user_id: z.string().min(1).max(64),
    rate_id: z.string().min(1).max(64),
    start_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const ListBookingsQuerySchema = z
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
    role: z.enum(['caller', 'callee']).optional(),
  })
  .strict();

export const CancelBookingSchema = z
  .object({
    reason: z.string().min(1).max(1000).optional(),
  })
  .strict();

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
export type ListBookingsQueryDto = z.infer<typeof ListBookingsQuerySchema>;
export type CancelBookingDto = z.infer<typeof CancelBookingSchema>;
