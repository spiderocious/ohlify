import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 5 — the four screens a banner can occupy. See docs/revamp-2/prd.md §5.1.
//
// The enum only had home_top, home_inline, and web_landing. Calls, chats, and
// settings are the other slots the app renders, and settings in particular is
// what makes KYC-upgrade nudges possible without a popup.
//
// Untransacted because a later migration or query may reference the new labels,
// and Postgres refuses to use an enum value added in the same transaction.
export const disableTransaction = true;

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TYPE banner_placement ADD VALUE IF NOT EXISTS 'calls_top'`);
  pgm.sql(`ALTER TYPE banner_placement ADD VALUE IF NOT EXISTS 'chats_top'`);
  pgm.sql(`ALTER TYPE banner_placement ADD VALUE IF NOT EXISTS 'settings_top'`);
};

export const down = (): void => {
  // Postgres cannot remove a value from an enum. The labels are inert if unused.
};
