import { z } from 'zod';

import { HANDLE_REGEX } from '@shared/constants/reserved-handles.js';

const handleSchema = z
  .string()
  .min(3)
  .max(24)
  .transform((v) => v.toLowerCase());

export const SetRoleSchema = z.object({
  role: z.enum(['client', 'professional']),
});

export const ClientKycPatchSchema = z
  .object({
    full_name: z.string().min(2).max(120).optional(),
    description: z.string().max(1000).optional(),
    interests: z.array(z.string().min(1).max(60)).max(20).optional(),
  })
  .strict();

export const IdentitySchema = z.object({
  type: z.enum(['nin', 'bvn', 'passport', 'drivers_license']),
  number: z.string().min(4).max(40),
  document_upload_id: z.string().min(1).max(120).optional(),
});

export const ProfessionalKycPatchSchema = z
  .object({
    full_name: z.string().min(2).max(120).optional(),
    handle: handleSchema.optional(),
    occupation: z.string().min(2).max(120).optional(),
    description: z.string().max(2000).optional(),
    interests: z.array(z.string().min(1).max(60)).max(20).optional(),
    identity: IdentitySchema.optional(),
  })
  .strict();

// Looser schema for the availability check: format/length issues should be
// returned as { available:false, reason:'invalid_format' } not a 400.
export const HandleCheckSchema = z.object({
  handle: z
    .string()
    .min(1)
    .max(64)
    .transform((v) => v.toLowerCase()),
});

export const ChangeHandleSchema = z.object({
  handle: handleSchema,
});

export type SetRoleDto = z.infer<typeof SetRoleSchema>;
export type ClientKycPatchDto = z.infer<typeof ClientKycPatchSchema>;
export type ProfessionalKycPatchDto = z.infer<typeof ProfessionalKycPatchSchema>;
export type IdentityDto = z.infer<typeof IdentitySchema>;
export type HandleCheckDto = z.infer<typeof HandleCheckSchema>;
export type ChangeHandleDto = z.infer<typeof ChangeHandleSchema>;

export const isHandleFormatValid = (raw: string): boolean => HANDLE_REGEX.test(raw.toLowerCase());
