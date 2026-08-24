import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Splits the single `rates` professional KYC item into `audio_rate` and
 * `video_rate`.
 *
 * No table changes. `professional_rates` already allows at most one active row
 * per (user, call_type) when `rates.single_rate_per_channel` is on (the
 * default), so one item per channel just surfaces the model that already
 * exists — and lets the client tell the user exactly which channel is still
 * unpriced instead of hiding both behind a list modal.
 *
 * `audio_rate` is required, `video_rate` is not. The completion gate counts
 * required items only (`all_complete`, `findIncompleteKeys`, `stepFor`), so
 * swapping one required item for one required item leaves `total_required`
 * unchanged and no existing professional's status moves. Flip `video_rate` to
 * required later with a plain config edit — no deploy needed.
 */
const AUDIO_RATE_ITEM = {
  key: 'audio_rate',
  kind: 'call_rate',
  label: 'Audio call rate',
  subtitle: 'Set what you charge for an audio call.',
  required: true,
  enabled: true,
  validation: [],
};

const VIDEO_RATE_ITEM = {
  key: 'video_rate',
  kind: 'call_rate',
  label: 'Video call rate',
  subtitle: 'Set what you charge for a video call.',
  required: false,
  enabled: true,
  validation: [],
};

/** The pre-split item, restored by `down`. Mirrors 0061_seed_kyc_items.ts. */
const LEGACY_RATES_ITEM = {
  key: 'rates',
  kind: 'rates',
  label: 'Rates',
  subtitle: 'Set what you charge per call type and duration.',
  required: true,
  enabled: true,
  validation: [{ rule: 'min_items', value: 1 }],
};

export const up = (pgm: MigrationBuilder): void => {
  // Drop the legacy item by rebuilding the array without it, rather than
  // rewriting the whole row: kyc.professional_items is operator-editable and
  // re-seeding it would silently discard every change made since 0061.
  pgm.sql(`
    UPDATE platform_config
       SET value = (
         SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
           FROM jsonb_array_elements(value) AS item
          WHERE item->>'key' <> 'rates'
       )
     WHERE key = 'kyc.professional_items'
  `);

  // Append each replacement under a NOT EXISTS guard so re-running is a no-op.
  pgm.sql(`
    UPDATE platform_config
       SET value = value || $$[${JSON.stringify(AUDIO_RATE_ITEM)}]$$::jsonb
     WHERE key = 'kyc.professional_items'
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(value) AS item
          WHERE item->>'key' = 'audio_rate'
       )
  `);

  pgm.sql(`
    UPDATE platform_config
       SET value = value || $$[${JSON.stringify(VIDEO_RATE_ITEM)}]$$::jsonb
     WHERE key = 'kyc.professional_items'
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(value) AS item
          WHERE item->>'key' = 'video_rate'
       )
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    UPDATE platform_config
       SET value = (
         SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
           FROM jsonb_array_elements(value) AS item
          WHERE item->>'key' NOT IN ('audio_rate', 'video_rate')
       )
     WHERE key = 'kyc.professional_items'
  `);

  pgm.sql(`
    UPDATE platform_config
       SET value = value || $$[${JSON.stringify(LEGACY_RATES_ITEM)}]$$::jsonb
     WHERE key = 'kyc.professional_items'
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(value) AS item
          WHERE item->>'key' = 'rates'
       )
  `);
};
