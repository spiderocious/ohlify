import type { MigrationBuilder } from 'node-pg-migrate';

// Calls revamp — schedule-from-chat (todo line 14) + chat low-credits threshold.
//
// A "scheduled call" is a chat-native marker, NOT a revival of the old bookings
// machinery. It's a message with kind='schedule' carrying a scheduled_at and a
// lifecycle status. Either party can propose one; the other accepts/declines;
// the sender can reschedule/cancel. Purely informational until notifications
// land (Phase 7) — the card's Join button just starts a normal instant call.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`CREATE TYPE message_kind AS ENUM ('text', 'schedule')`);
  pgm.sql(`
    CREATE TYPE schedule_status AS ENUM (
      'pending',    -- proposed, awaiting the other party
      'accepted',
      'declined',
      'cancelled'   -- withdrawn by the proposer (also used when superseded by a reschedule)
    )
  `);

  pgm.sql(`
    ALTER TABLE messages
      ADD COLUMN kind message_kind NOT NULL DEFAULT 'text',
      ADD COLUMN scheduled_at TIMESTAMPTZ,
      ADD COLUMN schedule_status schedule_status
  `);

  // A schedule message must carry a time + status; a text message must not.
  pgm.sql(`
    ALTER TABLE messages ADD CONSTRAINT messages_schedule_shape_chk CHECK (
      (kind = 'text'     AND scheduled_at IS NULL     AND schedule_status IS NULL)
      OR
      (kind = 'schedule' AND scheduled_at IS NOT NULL AND schedule_status IS NOT NULL)
    )
  `);

  // Surface the active (pending/accepted) schedule per conversation cheaply.
  pgm.sql(`
    CREATE INDEX messages_active_schedule_idx
      ON messages (conversation_id, scheduled_at)
      WHERE kind = 'schedule' AND schedule_status IN ('pending', 'accepted')
  `);

  // Client-facing threshold for the "credits running low" chat banner.
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('chat.low_minutes_threshold', '5', TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP INDEX IF EXISTS messages_active_schedule_idx`);
  pgm.sql(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_schedule_shape_chk`);
  pgm.sql(`
    ALTER TABLE messages
      DROP COLUMN IF EXISTS schedule_status,
      DROP COLUMN IF EXISTS scheduled_at,
      DROP COLUMN IF EXISTS kind
  `);
  pgm.sql(`DROP TYPE IF EXISTS schedule_status`);
  pgm.sql(`DROP TYPE IF EXISTS message_kind`);
  pgm.sql(`DELETE FROM platform_config WHERE key = 'chat.low_minutes_threshold'`);
};
