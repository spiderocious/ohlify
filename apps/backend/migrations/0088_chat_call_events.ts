import type { MigrationBuilder } from 'node-pg-migrate';

// Revamp-2 Phase 4 — calls appear inline in the thread. See docs/revamp-2/prd.md §4.5.
//
// A call between two people is part of their conversation, the way it is in
// every messenger. A distinct message kind rather than a text message keeps the
// thread honest — "Missed call" is a fact the system wrote, not something
// either party said — and lets the client style it as such.
//
// The call still appears in the Calls tab; this duplicates the entry point, not
// the record.
//
// `disableTransaction` because Postgres refuses to USE a new enum value in the
// same transaction that added it, and the CHECK below names 'call_event'.
// Migration 0089 finishes the job under its own transaction instead.
export const disableTransaction = true;

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TYPE message_kind ADD VALUE IF NOT EXISTS 'call_event'`);
};

export const down = (): void => {
  // Postgres cannot remove a value from an enum. 0089's down clears the rows
  // and the column, which is what actually matters; the unused label is inert.
};
