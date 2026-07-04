import type { MigrationBuilder } from 'node-pg-migrate';

// Call session event log.
//
// Every significant lifecycle event from the call-app is appended here:
// joined, active, remote_joined, remote_left, mute, reconnect, ended, etc.
// The table is the authoritative source for connected_seconds (computed from
// active → ended timestamps), call reference correlation, and observability.
//
// Design choices:
// - call_id is nullable so events can arrive before a backend call row exists
//   (test harness, instant-call Phase 4 where the row is created at join time).
// - session_token is a short-lived bearer token minted at ca:join time by the
//   parent. It authenticates event POSTs without requiring a full user JWT.
// - payload is JSONB — contains full EventPayload including participant snapshot,
//   duration, phase, mute state, etc. at the moment of the event.
// - call_reference is an opaque string the parent passes at join (booking_id,
//   order_id, etc.) — stored here for cross-system correlation queries.

export const up = (pgm: MigrationBuilder): void => {
  // Short-lived session tokens keyed by call_id + token.
  // Tokens are created by the parent shell at join time (Phase 4: by the calls service).
  // For the dev harness they're omitted and the endpoint accepts unauthenticated writes.
  pgm.createTable('call_session_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    call_id: { type: 'text', notNull: true },
    call_reference: { type: 'text', notNull: false },
    token_hash: { type: 'text', notNull: true },  // sha256(token) — never store raw
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('call_session_tokens', ['call_id', 'token_hash']);

  // Event log table.
  pgm.createTable('call_session_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    call_id: { type: 'text', notNull: true },
    call_reference: { type: 'text', notNull: false },
    event: { type: 'text', notNull: true },
    payload: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    occurred_at: { type: 'timestamptz', notNull: true },     // client-reported ts (ms epoch → timestamptz)
    received_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Fast retrieval by call_id (list events for a session) and time ordering.
  pgm.createIndex('call_session_events', ['call_id', 'occurred_at']);
  // Index on call_reference for cross-system correlation queries.
  pgm.createIndex('call_session_events', ['call_reference'], {
    where: 'call_reference IS NOT NULL',
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('call_session_events');
  pgm.dropTable('call_session_tokens');
};
