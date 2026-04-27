import { z } from 'zod';

export const ResolveAccountQuerySchema = z.object({
  account_number: z.string().regex(/^\d{8,12}$/, 'account_number must be 8-12 digits'),
  bank_code: z.string().min(2).max(10),
});

export type ResolveAccountQuery = z.infer<typeof ResolveAccountQuerySchema>;
