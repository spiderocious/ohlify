import type { MigrationBuilder } from 'node-pg-migrate';

// Calls revamp — Phase 1 (per-minute rates). See
// docs/revamp/01-per-minute-rates.md.
//
// 1. Seed the `rates.single_rate_per_channel` flag (public; clients gate UI on
//    it). Default TRUE — the single-rate-per-channel model is the mainstream
//    behaviour now. Set the row to 'false' to fall back to the legacy
//    multi-duration flow.
// 2. Pre-launch data reset: only test users exist, so instead of writing
//    consolidation logic we soft-delete every existing rate. Approved pros are
//    left with zero active rates; because rates is a required KYC item, the
//    normal KYC revaluation demotes them to pending_review and routes them back
//    to re-set ONE rate per channel. Ledger/history rows are untouched.
// 3. Add the one-active-rate-per-(user, call_type) partial unique index that
//    backs the new model. The pre-existing per-shape index
//    (professional_rates_active_shape_idx, migration 0019) stays — it is a
//    strict superset constraint and does not conflict.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('rates.single_rate_per_channel', 'true', TRUE)
    ON CONFLICT (key) DO NOTHING
  `);

  // Pre-launch nuke: soft-delete all current rates so the new uniqueness
  // index can be created cleanly and pros re-set under the new model.
  pgm.sql(`
    UPDATE professional_rates
       SET deleted_at = now()
     WHERE deleted_at IS NULL
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX professional_rates_one_per_channel_idx
      ON professional_rates (user_id, call_type)
      WHERE deleted_at IS NULL
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP INDEX IF EXISTS professional_rates_one_per_channel_idx`);
  pgm.sql(`DELETE FROM platform_config WHERE key = 'rates.single_rate_per_channel'`);
  // The soft-delete is intentionally NOT reversed (pre-launch reset).
};
