import { pool } from '@lib/db/pool.js';
import type {
  CallSessionEventRow,
  CallSessionSummary,
  CallSessionParticipantSummary,
} from './call-session-events.types.js';

interface InsertEventParams {
  call_id: string;
  call_reference: string | null;
  event: string;
  payload: object;
  occurred_at: Date;
}

export const insertEvent = async (params: InsertEventParams): Promise<CallSessionEventRow> => {
  const rows = await pool.query<CallSessionEventRow>(
    `INSERT INTO call_session_events (call_id, call_reference, event, payload, occurred_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      params.call_id,
      params.call_reference ?? null,
      params.event,
      JSON.stringify(params.payload),
      params.occurred_at,
    ],
  );
  return rows.rows[0]!;
};

export const listByCallId = async (
  callId: string,
  limit = 200,
  before?: Date,
): Promise<CallSessionEventRow[]> => {
  if (before) {
    const rows = await pool.query<CallSessionEventRow>(
      `SELECT * FROM call_session_events
       WHERE call_id = $1 AND occurred_at < $2
       ORDER BY occurred_at ASC
       LIMIT $3`,
      [callId, before, limit],
    );
    return rows.rows;
  }
  const rows = await pool.query<CallSessionEventRow>(
    `SELECT * FROM call_session_events
     WHERE call_id = $1
     ORDER BY occurred_at ASC
     LIMIT $2`,
    [callId, limit],
  );
  return rows.rows;
};

export const listByReference = async (
  callReference: string,
  limit = 200,
): Promise<CallSessionEventRow[]> => {
  const rows = await pool.query<CallSessionEventRow>(
    `SELECT * FROM call_session_events
     WHERE call_reference = $1
     ORDER BY occurred_at ASC
     LIMIT $2`,
    [callReference, limit],
  );
  return rows.rows;
};

export const getSummary = async (callId: string): Promise<CallSessionSummary | null> => {
  const rows = await pool.query<CallSessionEventRow>(
    `SELECT * FROM call_session_events
     WHERE call_id = $1
     ORDER BY occurred_at ASC`,
    [callId],
  );
  if (rows.rows.length === 0) return null;

  const events = rows.rows;
  const first = events[0]!;
  const last = events[events.length - 1]!;

  const activeEvent = events.find((e) => e.event === 'ca:active');
  const endedEvent = events.find((e) => e.event === 'ca:ended');

  let connectedSeconds: number | null = null;
  if (activeEvent && endedEvent) {
    connectedSeconds = Math.floor(
      (endedEvent.occurred_at.getTime() - activeEvent.occurred_at.getTime()) / 1000,
    );
  }

  // Extract participant snapshot from the first event that has participants.
  let participants: CallSessionParticipantSummary[] = [];
  for (const evt of events) {
    const p = evt.payload['participants'];
    if (Array.isArray(p) && p.length > 0) {
      participants = p as CallSessionParticipantSummary[];
      break;
    }
  }

  const endPayload = endedEvent?.payload as { reason?: string } | undefined;

  return {
    call_id: callId,
    call_reference: first.call_reference,
    event_count: events.length,
    first_event_at: first.occurred_at.toISOString(),
    last_event_at: last.occurred_at.toISOString(),
    connected_at: activeEvent?.occurred_at.toISOString() ?? null,
    ended_at: endedEvent?.occurred_at.toISOString() ?? null,
    connected_seconds: connectedSeconds,
    end_reason: endPayload?.reason ?? null,
    participants,
  };
};
