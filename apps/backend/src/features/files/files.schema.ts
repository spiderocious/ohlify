import { z } from 'zod';

/**
 * Query validation for the files feature.
 *
 * The rules mirror the Go service exactly — a 5-character prefix/suffix and an
 * alphanumeric extension — so a client that passed validation there still
 * passes here. Note these are validated as QUERY params, not a body.
 */

const FIVE_CHARS = 5;

// Message text is part of the contract — the Go service named the offending
// param ("prefix must be exactly 5 characters"), and clients surface these
// strings to users verbatim.
const affix = (name: 'prefix' | 'suffix') =>
  z
    .string()
    .length(FIVE_CHARS, `${name} must be exactly ${FIVE_CHARS} characters`)
    .optional();

export const UploadUriQuerySchema = z.object({
  prefix: affix('prefix'),
  suffix: affix('suffix'),
  ext: z
    .string()
    .regex(/^[a-zA-Z0-9]+$/, 'ext must contain only alphanumeric characters (e.g. jpg, png, mp4)')
    .optional(),
});

export const FileUriQuerySchema = z.object({
  // The Go service accepted any non-empty key. Kept permissive on purpose:
  // tightening it would reject keys minted before this port (which include
  // prefix/suffix forms) and break reads of files already in the bucket.
  //
  // Length-capped and newline-free so a hostile key can't be used to smuggle
  // headers or blow up a Redis key.
  key: z
    // `required_error` covers the absent-param case: Zod's default there is a
    // bare "Required", where the Go service said "key is required".
    .string({ required_error: 'key is required', invalid_type_error: 'key is required' })
    .min(1, 'key is required')
    .max(512, 'key is too long')
    .refine((v) => !/[\r\n]/.test(v), 'key must not contain newlines'),
});

export type UploadUriQuery = z.infer<typeof UploadUriQuerySchema>;
export type FileUriQuery = z.infer<typeof FileUriQuerySchema>;
