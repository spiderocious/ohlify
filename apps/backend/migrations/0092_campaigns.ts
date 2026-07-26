import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 5 — admin campaigns. See docs/revamp-2/prd.md §5.2.
//
// Authoring, audience, and delivery are three separate lifecycles. A campaign
// records the first two; delivery MATERIALIZES rows — one notification per
// targeted user — rather than broadcasting to an FCM topic.
//
// Topics look appealing and are a trap: no delivery record, no per-user state,
// no targeting beyond the topic itself, and no way to answer "did user X get
// this?". Materialising makes the notification panel a plain SELECT, dismissal
// a column, and reconciliation possible.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE campaign_status AS ENUM (
      'draft',
      'scheduled',
      'sending',
      'sent',
      'cancelled',
      'failed'
    )
  `);

  pgm.sql(`
    CREATE TABLE campaigns (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      body          TEXT,
      deeplink      TEXT,
      -- Same predicate shape banner_targets uses, evaluated when the job runs.
      segment       JSONB NOT NULL DEFAULT '{}'::jsonb,
      status        campaign_status NOT NULL DEFAULT 'draft',
      -- Set when scheduled; the window during which a send can still be pulled.
      send_at       TIMESTAMPTZ,
      -- BullMQ job id, so cancelling can remove the delayed job.
      job_id        TEXT,
      recipients    INTEGER NOT NULL DEFAULT 0,
      error         TEXT,
      created_by    TEXT REFERENCES admin_users(id),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      sent_at       TIMESTAMPTZ
    )
  `);

  pgm.sql(`CREATE INDEX campaigns_status_idx ON campaigns (status, created_at DESC)`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS campaigns');
  pgm.sql('DROP TYPE IF EXISTS campaign_status');
};
