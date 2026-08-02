import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Adds the client-side photo KYC item.
 *
 * Storage is a plain column on `users`, NOT `kyc_submissions.selfie_upload_key`.
 * That table requires `identity_type` and `identity_number` (both NOT NULL, no
 * default), which exist to describe an ID document a client never submits — so
 * a client can never own a row there, and the existing selfie writer
 * (`updateLatestSelfieKey`) is an UPDATE that would match nothing.
 *
 * Clients continue to auto-approve: this photo is collected so professionals
 * know who they are talking to, not verified against an ID. Nothing in the
 * review pipeline changes.
 */
const CLIENT_SELFIE_ITEM = {
  key: 'client_selfie',
  kind: 'selfie',
  label: 'Your photo',
  subtitle: 'Add a clear photo of yourself so professionals know who they’re talking to.',
  required: true,
  enabled: true,
  validation: [{ rule: 'allowed_extensions', value: ['jpg', 'jpeg', 'png'] }],
};

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_upload_key TEXT`);

  // Append rather than overwrite: kyc.client_items is operator-editable, and
  // re-seeding the whole array would silently discard any change made since
  // 0061. The NOT EXISTS guard keeps this idempotent.
  pgm.sql(`
    UPDATE platform_config
       SET value = value || $$[${JSON.stringify(CLIENT_SELFIE_ITEM)}]$$::jsonb
     WHERE key = 'kyc.client_items'
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(value) AS item
          WHERE item->>'key' = 'client_selfie'
       )
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    UPDATE platform_config
       SET value = (
         SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
           FROM jsonb_array_elements(value) AS item
          WHERE item->>'key' <> 'client_selfie'
       )
     WHERE key = 'kyc.client_items'
  `);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS selfie_upload_key`);
};
