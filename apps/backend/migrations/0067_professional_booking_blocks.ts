import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Per-professional "do not book me here" recurring time-of-day blocks.
 *
 * Each row carves out a [start_minute, end_minute) interval of every day
 * during which the availability endpoint returns slots as
 * `available: false` and `POST /bookings` rejects the slot with the same
 * 409 `professional_unavailable` it already uses for double-bookings.
 *
 * Minutes are interpreted in the pro's local timezone, which today is the
 * platform default (`Africa/Lagos`) since per-user tz isn't a thing yet.
 *
 * Why minute-of-day instead of TIME: the existing availability config
 * already uses integer hour fields, so integer arithmetic against
 * `daily_start_hour * 60` etc. is the natural fit.
 *
 * Overlapping blocks are allowed — a 5–7pm block and a 6–8pm block are
 * semantically equivalent to a single 5–8pm window. Service code merges
 * on save as a normalization, but the DB doesn't enforce it.
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE professional_booking_blocks (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_minute SMALLINT NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440),
      end_minute   SMALLINT NOT NULL CHECK (end_minute > 0 AND end_minute <= 1440),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (end_minute > start_minute)
    )
  `);

  pgm.sql(
    `CREATE INDEX professional_booking_blocks_user_idx
       ON professional_booking_blocks (user_id)`,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP TABLE IF EXISTS professional_booking_blocks');
};
