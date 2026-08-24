import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Makes outbox-driven notifications idempotent.
 *
 * The outbox worker retries a row whose dispatch threw — that is the whole
 * point of `attempt_count` and the backoff. Push is naturally forgiving of a
 * repeat, but a notification row is not: a retry after a partial failure would
 * leave the user two identical notices and no way to tell which was real.
 *
 * Nullable because rows written directly by a service (admin campaigns, and
 * anything not routed through the outbox) have no originating event. The unique
 * index is partial for the same reason — Postgres treats NULLs as distinct, but
 * being explicit documents that only outbox-born rows are deduplicated.
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS outbox_id TEXT`);
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS notifications_outbox_id_uniq
      ON notifications (outbox_id)
      WHERE outbox_id IS NOT NULL
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP INDEX IF EXISTS notifications_outbox_id_uniq`);
  pgm.sql(`ALTER TABLE notifications DROP COLUMN IF EXISTS outbox_id`);
};
