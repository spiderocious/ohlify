import type { MigrationBuilder } from 'node-pg-migrate';

// Second half of the call-event change (0088 added the enum value).
//
// Separate migration because Postgres will not let a freshly-added enum value
// be referenced in the same transaction that created it, and the CHECK below
// names 'call_event'. Both halves run untransacted so the ALTER TYPE in 0088 is
// genuinely committed before this one reads the label.
export const disableTransaction = true;

export const up = (pgm: MigrationBuilder): void => {
  // The old constraint only knew text and schedule; its text branch happened to
  // admit a call event by accident of matching neither. Restate it so each kind
  // is explicit about the columns it may carry.
  // Compares kind::text rather than the enum literal. Postgres refuses to read
  // a freshly-added enum label until the transaction that added it has
  // committed, and it cannot tell that ours has; the cast sidesteps that check
  // while enforcing exactly the same rule.
  pgm.sql(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_schedule_shape_chk`);
  pgm.sql(`
    ALTER TABLE messages ADD CONSTRAINT messages_shape_chk CHECK (
      (kind::text = 'text'       AND scheduled_at IS NULL     AND schedule_status IS NULL)
      OR
      (kind::text = 'schedule'   AND scheduled_at IS NOT NULL AND schedule_status IS NOT NULL)
      OR
      (kind::text = 'call_event' AND scheduled_at IS NULL     AND schedule_status IS NULL)
    )
  `);

  // What happened, and to which call. JSONB rather than columns because the
  // shape differs per outcome — a completed call has a duration, a missed one
  // does not — and neither is worth a nullable column apiece.
  pgm.sql(`ALTER TABLE messages ADD COLUMN call_event JSONB`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM messages WHERE kind::text = 'call_event'`);
  pgm.sql(`ALTER TABLE messages DROP COLUMN IF EXISTS call_event`);
  pgm.sql(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_shape_chk`);
  pgm.sql(`
    ALTER TABLE messages ADD CONSTRAINT messages_schedule_shape_chk CHECK (
      (kind = 'text'     AND scheduled_at IS NULL     AND schedule_status IS NULL)
      OR
      (kind = 'schedule' AND scheduled_at IS NOT NULL AND schedule_status IS NOT NULL)
    )
  `);
};
