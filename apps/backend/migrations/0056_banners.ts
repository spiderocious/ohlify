import type { MigrationBuilder } from 'node-pg-migrate';

// In-app banners. Admin curates a small set of banner slots that the
// mobile app polls (or fetches once per session). Each banner has a
// scheduled active window (`starts_at`/`ends_at`) and an `is_active`
// admin override; we only show banners where both are satisfied.
//
// Targeting is intentionally minimal for v1 — `audience` is a coarse
// filter (all/clients/professionals). Per-region/per-language can come
// later as JSONB filters.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(
    `CREATE TYPE banner_audience AS ENUM ('all', 'clients', 'professionals')`,
  );

  pgm.sql(`
    CREATE TABLE banners (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      body          TEXT,
      image_url     TEXT,
      cta_label     TEXT,
      cta_url       TEXT,
      audience      banner_audience NOT NULL DEFAULT 'all',
      priority      INTEGER NOT NULL DEFAULT 0,
      is_active     BOOLEAN NOT NULL DEFAULT FALSE,
      starts_at     TIMESTAMPTZ,
      ends_at       TIMESTAMPTZ,
      created_by    TEXT REFERENCES admin_users(id),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT banners_window_chk
        CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
    )
  `);

  pgm.sql(
    `CREATE INDEX banners_active_idx ON banners (audience, priority DESC, starts_at) WHERE is_active = TRUE`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS banners');
  pgm.sql('DROP TYPE IF EXISTS banner_audience');
};
