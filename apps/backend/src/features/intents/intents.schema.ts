import { z } from 'zod';

import { IntentNeed } from './intents.types.js';

// One schema per need, discriminated on `need`, so an unknown need is rejected
// at the edge rather than reaching an evaluator that has no branch for it.
const MinutesRequirementSchema = z
  .object({
    need: z.literal(IntentNeed.MINUTES),
    professional_id: z.string().min(1),
    call_type: z.enum(['audio', 'video']),
    minimum_seconds: z.number().int().positive().max(86_400),
  })
  .strict();

const WalletBalanceRequirementSchema = z
  .object({
    need: z.literal(IntentNeed.WALLET_BALANCE),
    minimum_kobo: z.number().int().positive(),
  })
  .strict();

export const CreateIntentSchema = z.discriminatedUnion('need', [
  MinutesRequirementSchema,
  WalletBalanceRequirementSchema,
]);

export type CreateIntentDto = z.infer<typeof CreateIntentSchema>;
