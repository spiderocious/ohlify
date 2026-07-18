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

export type StartCallDto = z.infer<typeof StartCallSchema>;
export type EndCallDto = z.infer<typeof EndCallSchema>;
