import { z } from 'zod';

import type { DevCallPartyKey } from './call-sessions.types.js';

export const CreateCallSessionSchema = z
  .object({
    call_type: z.enum(['audio', 'video']).optional().default('audio'),
    duration_minutes: z.number().int().min(1).max(120).optional().default(30),
    label: z.string().max(80).optional(),
  })
  .strict();

export type CreateCallSessionDto = z.infer<typeof CreateCallSessionSchema>;

export const VALID_PARTY_KEYS: readonly DevCallPartyKey[] = ['a', 'b'];

export const isValidPartyKey = (v: string): v is DevCallPartyKey =>
  (VALID_PARTY_KEYS as readonly string[]).includes(v);
