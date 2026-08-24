import { describe, expect, it } from 'vitest';

import { FileUriQuerySchema, UploadUriQuerySchema } from './files.schema.js';

/**
 * These rules are a contract with clients that already shipped against the Go
 * service, so they are pinned rather than merely exercised: anything the Go
 * service accepted must still be accepted, and its rejection messages are the
 * strings clients surface to users.
 */
describe('upload-uri query', () => {
  it('accepts an empty query — every param is optional', () => {
    expect(UploadUriQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts a bare extension', () => {
    const r = UploadUriQuerySchema.safeParse({ ext: 'jpg' });
    expect(r.success).toBe(true);
  });

  it('rejects a non-alphanumeric extension', () => {
    // A dot would produce `uuid..jpg`; a slash would let the caller escape the
    // generated key and choose their own path in the bucket.
    for (const ext of ['.jpg', 'j pg', 'jpg/', '../etc']) {
      expect(UploadUriQuerySchema.safeParse({ ext }).success).toBe(false);
    }
  });

  it('requires prefix and suffix to be exactly five characters', () => {
    expect(UploadUriQuerySchema.safeParse({ prefix: 'imgs1' }).success).toBe(true);
    expect(UploadUriQuerySchema.safeParse({ suffix: 'thumb' }).success).toBe(true);
    expect(UploadUriQuerySchema.safeParse({ prefix: 'abcd' }).success).toBe(false);
    expect(UploadUriQuerySchema.safeParse({ prefix: 'abcdef' }).success).toBe(false);
  });

  it('names the offending param, as the Go service did', () => {
    // Clients surface these strings to users verbatim, so the text is contract.
    const r = UploadUriQuerySchema.safeParse({ prefix: 'abc' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('prefix must be exactly 5 characters');
  });
});

describe('file-uri query', () => {
  it('requires a key, with the Go service’s wording', () => {
    for (const input of [{}, { key: '' }]) {
      const r = FileUriQuerySchema.safeParse(input);
      expect(r.success).toBe(false);
      // Zod's default for an absent field is a bare "Required"; the Go service
      // said "key is required", and that is what clients display.
      if (!r.success) expect(r.error.issues[0]?.message).toBe('key is required');
    }
  });

  it('accepts the prefix/suffix key forms minted before this port', () => {
    // Tightening this to a bare uuid.ext would make files uploaded through the
    // Go service unreadable.
    const legacy = 'imgs1-550e8400-e29b-41d4-a716-446655440000-thumb1.jpg';
    expect(FileUriQuerySchema.safeParse({ key: legacy }).success).toBe(true);
  });

  it('rejects newlines and over-long keys', () => {
    expect(FileUriQuerySchema.safeParse({ key: 'a\nb' }).success).toBe(false);
    expect(FileUriQuerySchema.safeParse({ key: 'x'.repeat(513) }).success).toBe(false);
  });
});
