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

export const PayFromWalletSchema = z
  .object({
    amount_kobo: z.number().int().positive(),
    purpose: z.literal('call_payment'),
    external_ref_id: z.string().min(1).max(120),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const RequestWithdrawalSchema = z
  .object({
    amount_kobo: z.number().int().positive(),
  })
  .strict();

export const ListWithdrawalsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'reversed']).optional(),
  })
  .strict();

export type InitializeFundingDto = z.infer<typeof InitializeFundingSchema>;
export type VerifyFundingDto = z.infer<typeof VerifyFundingSchema>;
export type TransactionsQueryDto = z.infer<typeof TransactionsQuerySchema>;
export type PayFromWalletDto = z.infer<typeof PayFromWalletSchema>;
export type RequestWithdrawalDto = z.infer<typeof RequestWithdrawalSchema>;
export type ListWithdrawalsQueryDto = z.infer<typeof ListWithdrawalsQuerySchema>;
