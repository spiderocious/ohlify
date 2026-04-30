import type { MigrationBuilder } from 'node-pg-migrate';

// Round out the banners schema to match the spec:
//   - subtitle      TEXT (nullable)
//   - placement     banner_placement (enum from 0002) — defaults to
//                   'home_top' so existing rows have a value, then drop
//                   the default so future inserts must specify
//   - deeplink      TEXT (nullable) — opens a specific app screen
//   - body_blocks   JSONB array of ContentBlock POJOs (default [])
//
// The original 0056 had `body TEXT` + `cta_label/cta_url` as a thin v1.
// We KEEP `body` and the CTA pair: short text-only banners can still ship
// with no blocks, and link out via cta_url. The mobile renderer falls
// back to body when body_blocks is empty.
//
// We also extend the active-window index to include placement so the
// public read endpoint's `?placement=` filter is fast.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE banners
      ADD COLUMN subtitle    TEXT,
      ADD COLUMN placement   banner_placement NOT NULL DEFAULT 'home_top',
      ADD COLUMN deeplink    TEXT,
      ADD COLUMN body_blocks JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
  pgm.sql(`ALTER TABLE banners ALTER COLUMN placement DROP DEFAULT`);

  // Replace the old active-list index with one that includes placement.
  pgm.sql(`DROP INDEX IF EXISTS banners_active_idx`);
  pgm.sql(`
    CREATE INDEX banners_active_idx
      ON banners (placement, audience, priority DESC, starts_at)
      WHERE is_active = TRUE
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP INDEX IF EXISTS banners_active_idx`);
  pgm.sql(
    `CREATE INDEX banners_active_idx ON banners (audience, priority DESC, starts_at) WHERE is_active = TRUE`,
  );
  pgm.sql(`
    ALTER TABLE banners
      DROP COLUMN IF EXISTS body_blocks,
      DROP COLUMN IF EXISTS deeplink,
      DROP COLUMN IF EXISTS placement,
      DROP COLUMN IF EXISTS subtitle
  `);
};
