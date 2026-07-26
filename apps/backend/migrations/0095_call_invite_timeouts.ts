import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 8 — every step of a multi-party invite has a deadline.
// See docs/revamp-2/prd.md §8.1.
//
// Two separate waits, because they fail differently:
//
//   approval — the professional never looked at the overlay. Auto-DECLINE: a
//              silent professional has not consented, and consent is the whole
//              point of the approval step.
//   ring     — the invitee never picked up. EXPIRE and let the call carry on
//              with two people; the conversation being paid for should not be
//              held hostage by a third party's phone.
//
// The caller's meter runs throughout 🔒 — it is the professional's time either
// way, and every second is already visible in the ledger.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('presence.invite_approval_timeout_seconds', '30'::jsonb, TRUE),
      ('presence.invite_ring_timeout_seconds', '30'::jsonb, TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM platform_config
     WHERE key IN (
       'presence.invite_approval_timeout_seconds',
       'presence.invite_ring_timeout_seconds'
     )
  `);
};
