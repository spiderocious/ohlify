import { z } from 'zod';

// Attachment file_keys come from the uploads microservice. Same string-key
// shape as POST /me/avatar — the backend doesn't fetch or validate them, just
// records what the client claimed.
const attachmentFileKey = z
  .string()
  .min(1)
  .max(512)
  .regex(
    /^[A-Za-z0-9._/-]+$/,
    'attachments[] must be alphanumeric file_keys (with . _ / - allowed)',
  );

export const CreateTicketSchema = z
  .object({
    subject: z.string().min(2).max(200),
    message: z.string().min(2).max(10_000),
    attachments: z.array(attachmentFileKey).max(10).optional(),
  })
  .strict();

export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;
