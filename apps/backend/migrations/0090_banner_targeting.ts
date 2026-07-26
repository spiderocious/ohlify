import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 5 — banner targeting. See docs/revamp-2/prd.md §5.1.
//
// A banner is a poster on a wall, not a message in an inbox: it is up for a
// period, and if you were not in the room while it was up you never see it.
// That is the opposite of a notification, which backfills, and it is why
// `ends_at` becomes mandatory here — an immortal banner is nearly always an
// authoring mistake, and it is what produces "Christmas giveaway seen on the
// 31st".
//
// Targets are evaluated at READ time, not send time. That is what keeps
// "users younger than 7 days" correct as someone ages out of it, and it lets
// priority resolution stay a single ordered query.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`CREATE TYPE banner_target_kind AS ENUM ('user', 'segment', 'all')`);

  pgm.sql(`
    CREATE TABLE banner_targets (
      id         TEXT PRIMARY KEY,
      banner_id  TEXT NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
      kind       banner_target_kind NOT NULL,
      -- kind='user'    → { user_ids: [...] }
      -- kind='segment' → predicate object (role, platform, account age, …)
      -- kind='all'     → {}
      -- JSONB so a new predicate does not cost a migration.
      payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  pgm.sql(`CREATE INDEX banner_targets_banner_idx ON banner_targets (banner_id)`);

  // View-once state. NOT dismissals — banners are not dismissable; this only
  // records that a `view_once` banner has had its one showing.
  pgm.sql(`
    CREATE TABLE banner_views (
      user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      banner_id TEXT NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
      seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, banner_id)
    )
  `);

  pgm.sql(`ALTER TABLE banners ADD COLUMN view_once BOOLEAN NOT NULL DEFAULT FALSE`);

  // Existing rows without an end date get one rather than blocking the
  // constraint. 30 days is long enough not to yank live copy out from under
  // anyone, and short enough that a forgotten banner retires itself.
  pgm.sql(`UPDATE banners SET ends_at = now() + INTERVAL '30 days' WHERE ends_at IS NULL`);
  pgm.sql(`ALTER TABLE banners ALTER COLUMN ends_at SET NOT NULL`);

  // Every banner needs at least one target row. Backfill the existing coarse
  // `audience` column into the new model so nothing in flight goes dark.
  pgm.sql(`
    INSERT INTO banner_targets (id, banner_id, kind, payload)
    SELECT 'bt_' || b.id,
           b.id,
           CASE WHEN b.audience = 'all' THEN 'all'::banner_target_kind
                ELSE 'segment'::banner_target_kind END,
           CASE WHEN b.audience = 'all' THEN '{}'::jsonb
                WHEN b.audience = 'clients' THEN '{"role":"client"}'::jsonb
                ELSE '{"role":"professional"}'::jsonb END
      FROM banners b
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE banners ALTER COLUMN ends_at DROP NOT NULL`);
  pgm.sql(`ALTER TABLE banners DROP COLUMN IF EXISTS view_once`);
  pgm.sql('DROP TABLE IF EXISTS banner_views');
  pgm.sql('DROP TABLE IF EXISTS banner_targets');
  pgm.sql('DROP TYPE IF EXISTS banner_target_kind');
};
