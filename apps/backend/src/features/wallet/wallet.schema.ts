import { z } from 'zod';

export const InitializeFundingSchema = z
  .object({
    amount_kobo: z.number().int().positive(),
    callback_url: z.string().url().max(1024).optional(),
  })
  .strict();

export const VerifyFundingSchema = z
  .object({
    reference: z.string().min(8).max(120),
  })
  .strict();

export const TransactionsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export type InitializeFundingDto = z.infer<typeof InitializeFundingSchema>;
export type VerifyFundingDto = z.infer<typeof VerifyFundingSchema>;
export type TransactionsQueryDto = z.infer<typeof TransactionsQuerySchema>;
