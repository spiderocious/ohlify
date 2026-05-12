import type { MigrationBuilder } from 'node-pg-migrate';

// In-app support tickets. v1 only handles authed users; guest support comes
// with §20 (column stays nullable). Attachments are file_keys from the
// uploads microservice — the backend doesn't fetch or validate them, just
// records what the client claimed. Per db-schema.md §3.30.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE tickets (
      id          TEXT PRIMARY KEY,
      user_id     TEXT REFERENCES users(id),
      guest_id    TEXT,
      subject     TEXT NOT NULL,
      message     TEXT NOT NULL,
      attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
      status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK ((user_id IS NOT NULL) OR (guest_id IS NOT NULL))
    )
  `);
  pgm.sql(`CREATE INDEX tickets_user_idx ON tickets (user_id, created_at DESC) WHERE user_id IS NOT NULL`);
  pgm.sql(`CREATE INDEX tickets_status_idx ON tickets (status, created_at DESC)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS tickets`);
};
