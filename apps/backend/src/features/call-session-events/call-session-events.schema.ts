import { z } from 'zod';

const ParticipantSchema = z.object({
  uid: z.number(),
  name: z.string(),
  avatar_key: z.string().nullable(),
  role: z.enum(['local', 'remote']),
});

const AuthorSchema = z.object({
  uid: z.number().nullable(),
  name: z.string().nullable(),
});

// Full EventPayload shape from the call-app. Validated loosely — extra keys are
// allowed because the payload schema may evolve; we store everything as-is.
export const SingleEventSchema = z
  .object({
    event: z.string().min(1).max(64),
    ts: z.number().int().positive(),
    author: AuthorSchema.optional().nullable(),
    call_id: z.string().min(1).max(128).nullable(),
    call_reference: z.string().max(256).nullable().optional(),
    agora_channel: z.string().max(128).nullable().optional(),
    local_uid: z.number().nullable().optional(),
    platform: z.string().optional(),
    participants: z.array(ParticipantSchema).optional(),
    phase: z.string().nullable().optional(),
    muted: z.boolean().nullable().optional(),
    camera_enabled: z.boolean().nullable().optional(),
    duration_seconds: z.number().nullable().optional(),
    duration_minutes_limit: z.number().nullable().optional(),
    remote_muted: z.boolean().nullable().optional(),
    data: z.record(z.unknown()).optional(),
  })
  .passthrough();

// Accepts either a single event object or an array of up to 50 events.
export const IngestEventSchema = z.union([
  SingleEventSchema,
  z.array(SingleEventSchema).min(1).max(50),
]);

export type SingleEventDto = z.infer<typeof SingleEventSchema>;
export type IngestEventDto = z.infer<typeof IngestEventSchema>;

export const ListEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  before: z.string().datetime({ offset: true }).optional(),
});

export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;
