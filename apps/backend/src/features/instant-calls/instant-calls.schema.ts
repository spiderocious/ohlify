import { z } from 'zod';

export const StartCallSchema = z
  .object({
    professional_id: z.string().min(1),
    call_type: z.enum(['audio', 'video']),
  })
  .strict();

export const EndCallSchema = z
  .object({
    // Client-reported talk time (seconds). Server clamps to the minutes cap.
    connected_seconds: z.number().int().nonnegative().default(0),
  })
  .strict();

export const InviteToCallSchema = z
  .object({
    // Users are found by handle — it is the only public identifier, and
    // exposing user ids in an invite box would invite enumeration.
    handle: z.string().min(1).max(64),
  })
  .strict();

export const RespondToInviteSchema = z
  .object({
    approve: z.boolean(),
  })
  .strict();

export const RespondToRingSchema = z
  .object({
    accept: z.boolean(),
  })
  .strict();

export type InviteToCallDto = z.infer<typeof InviteToCallSchema>;
export type RespondToInviteDto = z.infer<typeof RespondToInviteSchema>;
export type RespondToRingDto = z.infer<typeof RespondToRingSchema>;

export type StartCallDto = z.infer<typeof StartCallSchema>;
export type EndCallDto = z.infer<typeof EndCallSchema>;
