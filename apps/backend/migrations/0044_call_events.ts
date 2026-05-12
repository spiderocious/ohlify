import type { MigrationBuilder } from 'node-pg-migrate';

// Append-only audit log of every event in a call's lifecycle. Every state
// change, every join, every leave, every webhook delivery, every token mint
// gets a row here. This is the table you read top-down when debugging.
//
// payload is JSONB so we don't have to migrate every time we add a new
// event_type.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE call_events (
      id            TEXT PRIMARY KEY,
      call_id       TEXT NOT NULL REFERENCES calls(id),
      event_type    TEXT NOT NULL,
      payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
      occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX call_events_call_idx ON call_events (call_id, occurred_at ASC)`);
  pgm.sql(`CREATE INDEX call_events_type_idx ON call_events (event_type, occurred_at DESC)`);

  // Append-only — reject UPDATE/DELETE at the trigger layer to match the
  // wallet ledger discipline.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION call_events_reject_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'call_events is append-only';
    END;
    $$ LANGUAGE plpgsql
  `);
  pgm.sql(`
    CREATE TRIGGER call_events_no_update
      BEFORE UPDATE ON call_events
      FOR EACH ROW EXECUTE FUNCTION call_events_reject_mutation()
  `);
  pgm.sql(`
    CREATE TRIGGER call_events_no_delete
      BEFORE DELETE ON call_events
      FOR EACH ROW EXECUTE FUNCTION call_events_reject_mutation()
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TRIGGER IF EXISTS call_events_no_delete ON call_events`);
  pgm.sql(`DROP TRIGGER IF EXISTS call_events_no_update ON call_events`);
  pgm.sql(`DROP FUNCTION IF EXISTS call_events_reject_mutation()`);
  pgm.sql(`DROP TABLE IF EXISTS call_events`);
};
