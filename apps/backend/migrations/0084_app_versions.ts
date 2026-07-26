import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 2 — app version gating. See docs/revamp-2/prd.md §2.2.
//
// One row per platform holds the minimum build we still accept, plus the copy
// shown when a client falls below it. `forced` decides whether the prompt can
// be dismissed.
//
// `store_url` is editable rather than hard-coded so testers can be pointed at
// an internal download page during development instead of a store listing that
// does not exist yet.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE app_versions (
      platform          TEXT PRIMARY KEY CHECK (platform IN ('ios', 'android')),
      min_version       TEXT NOT NULL,
      forced            BOOLEAN NOT NULL DEFAULT FALSE,
      store_url         TEXT NOT NULL,
      title             TEXT NOT NULL,
      description_md    TEXT,
      illustration_key  TEXT,
      updated_by        TEXT REFERENCES admin_users(id),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Seeded at 0.0.0 so the gate is inert until an operator raises it. Shipping
  // a real minimum here would lock out every build in the wild the moment this
  // migration ran.
  pgm.sql(`
    INSERT INTO app_versions (platform, min_version, forced, store_url, title, description_md) VALUES
      ('ios', '0.0.0', FALSE, 'https://apps.apple.com/app/ohlify',
        'Update available', 'A new version of Ohlify is available.'),
      ('android', '0.0.0', FALSE, 'https://play.google.com/store/apps/details?id=com.ohlify.app',
        'Update available', 'A new version of Ohlify is available.')
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS app_versions');
};
