import { z } from 'zod';

export const OpenConversationSchema = z
  .object({
    professional_id: z.string().min(1),
  })
  .strict();

export const SendMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(4000),
  })
  .strict();

export const ListQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
  })
  .strict();

export const ProposeScheduleSchema = z
  .object({
    scheduled_at: z.string().min(1),
    note: z.string().trim().max(280).optional(),
  })
  .strict();

export const ScheduleActionSchema = z
  .object({
    action: z.enum(['accept', 'decline', 'cancel']),
  })
  .strict();

export const RescheduleSchema = z
  .object({
    scheduled_at: z.string().min(1),
    note: z.string().trim().max(280).optional(),
  })
  .strict();

export type OpenConversationDto = z.infer<typeof OpenConversationSchema>;
export type SendMessageDto = z.infer<typeof SendMessageSchema>;
export type ProposeScheduleDto = z.infer<typeof ProposeScheduleSchema>;
export type ScheduleActionDto = z.infer<typeof ScheduleActionSchema>;
export type RescheduleDto = z.infer<typeof RescheduleSchema>;

/** Group chat: invite by handle, and the professional's ruling. */
export const InviteParticipantSchema = z
  .object({
    // Email, not handle: `handle` is a professional KYC item, so most client
    // accounts have none — and clients are the only people who can be invited.
    email: z.string().email('Enter a valid email address').max(254),
  })
  .strict();

export const RespondToChatInviteSchema = z
  .object({
    approve: z.boolean(),
  })
  .strict();

export type InviteParticipantDto = z.infer<typeof InviteParticipantSchema>;
export type RespondToChatInviteDto = z.infer<typeof RespondToChatInviteSchema>;
