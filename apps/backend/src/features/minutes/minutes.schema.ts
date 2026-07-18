import { z } from 'zod';

const callType = z.enum(['audio', 'video']);

export const BuyMinutesSchema = z
  .object({
    professional_id: z.string().min(1),
    call_type: callType,
    amount_kobo: z.number().int().positive(),
  })
  .strict();

export const BalanceQuerySchema = z
  .object({
    professional_id: z.string().min(1),
    call_type: callType,
  })
  .strict();

export type BuyMinutesDto = z.infer<typeof BuyMinutesSchema>;
export type BalanceQueryDto = z.infer<typeof BalanceQuerySchema>;
