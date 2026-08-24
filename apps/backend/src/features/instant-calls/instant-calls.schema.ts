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
    // Email, not handle: `handle` is a professional KYC item, so most client
    // accounts have none — and clients are the only people who can be invited.
    //
    // This does make the endpoint an account-existence oracle, which is why the
    // route carries a tight per-user rate limit rather than the ordinary one.
    email: z.string().email('Enter a valid email address').max(254),
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
/**
 * Answering while already on another call.
 *
 * `end_ongoing` is the callee's choice — the WhatsApp "answer and end current"
 * option. Optional and defaulting to false so an ordinary answer, and every
 * client that predates this, keeps working unchanged.
 */
export const AnswerCallSchema = z
  .object({
    end_ongoing: z.boolean().optional(),
  })
  .strict();

export type AnswerCallDto = z.infer<typeof AnswerCallSchema>;
export type EndCallDto = z.infer<typeof EndCallSchema>;
