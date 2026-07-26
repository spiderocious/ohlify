import type { PoolClient } from 'pg';

import { pool } from '@lib/db/pool.js';
import { id as makeId } from '@lib/ids.js';

import {
  OCCUPYING_PARTICIPANT_STATUSES,
  type CallParticipantRole,
  type CallParticipantRow,
  type CallParticipantStatus,
} from './call-participants.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

export const create = async (
  runner: QueryRunner,
  input: {
    callId: string;
    userId: string;
    role: CallParticipantRole;
    status: CallParticipantStatus;
    invitedBy?: string | null;
  },
): Promise<CallParticipantRow> => {
  const res = await runner.query<CallParticipantRow>(
    `INSERT INTO call_participants (id, call_id, user_id, role, status, invited_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [makeId('cp'), input.callId, input.userId, input.role, input.status, input.invitedBy ?? null],
  );
  return res.rows[0]!;
};

export const listForCall = async (callId: string): Promise<CallParticipantRow[]> => {
  const res = await pool.query<CallParticipantRow>(
    `SELECT * FROM call_participants WHERE call_id = $1 ORDER BY created_at ASC`,
    [callId],
  );
  return res.rows;
};

/** Participants plus the display fields the in-call roster needs. */
export const listForCallWithUsers = async (
  callId: string,
): Promise<
  (CallParticipantRow & { name: string | null; avatar_url: string | null; handle: string | null })[]
> => {
  const res = await pool.query<
    CallParticipantRow & { name: string | null; avatar_url: string | null; handle: string | null }
  >(
    `SELECT cp.*, u.full_name AS name, u.avatar_url, u.handle
       FROM call_participants cp
       JOIN users u ON u.id = cp.user_id
      WHERE cp.call_id = $1
      ORDER BY cp.created_at ASC`,
    [callId],
  );
  return res.rows;
};

export const findById = async (
  runner: QueryRunner,
  participantId: string,
): Promise<CallParticipantRow | null> => {
  const res = await runner.query<CallParticipantRow>(
    `SELECT * FROM call_participants WHERE id = $1`,
    [participantId],
  );
  return res.rows[0] ?? null;
};

/** Locks the row so approve/decline/expire cannot interleave on the same invite. */
export const findByIdForUpdate = async (
  runner: QueryRunner,
  participantId: string,
): Promise<CallParticipantRow | null> => {
  const res = await runner.query<CallParticipantRow>(
    `SELECT * FROM call_participants WHERE id = $1 FOR UPDATE`,
    [participantId],
  );
  return res.rows[0] ?? null;
};

/** How many seats are taken — pending and ringing count, because they are promised. */
export const countOccupying = async (runner: QueryRunner, callId: string): Promise<number> => {
  const res = await runner.query<{ count: string }>(
    `SELECT count(*) AS count
       FROM call_participants
      WHERE call_id = $1 AND status = ANY($2::call_participant_status[])`,
    [callId, OCCUPYING_PARTICIPANT_STATUSES],
  );
  return Number(res.rows[0]?.count ?? 0);
};

/** True when the user is already tied up in some other live call. */
export const isUserBusyElsewhere = async (
  runner: QueryRunner,
  userId: string,
  exceptCallId: string,
): Promise<boolean> => {
  const res = await runner.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM call_participants
        WHERE user_id = $1
          AND call_id <> $2
          AND status = ANY($3::call_participant_status[])
     ) AS exists`,
    [userId, exceptCallId, OCCUPYING_PARTICIPANT_STATUSES],
  );
  return res.rows[0]?.exists ?? false;
};

/**
 * Guarded status move.
 *
 * The `from` list is the concurrency guard: a professional approving at the
 * same moment the 30s timeout fires must produce exactly one winner, and the
 * loser's UPDATE matches nothing rather than overwriting a settled decision.
 */
export const transitionStatus = async (
  runner: QueryRunner,
  input: {
    participantId: string;
    from: CallParticipantStatus[];
    to: CallParticipantStatus;
    setJoinedAt?: boolean;
    setLeftAt?: boolean;
  },
): Promise<CallParticipantRow | null> => {
  const res = await runner.query<CallParticipantRow>(
    `UPDATE call_participants
        SET status = $3,
            joined_at = CASE WHEN $4::boolean THEN now() ELSE joined_at END,
            left_at   = CASE WHEN $5::boolean THEN now() ELSE left_at END,
            updated_at = now()
      WHERE id = $1
        AND status = ANY($2::call_participant_status[])
      RETURNING *`,
    [
      input.participantId,
      input.from,
      input.to,
      input.setJoinedAt ?? false,
      input.setLeftAt ?? false,
    ],
  );
  return res.rows[0] ?? null;
};

/** Releases every seat when the call ends, so nobody stays "busy" forever. */
export const releaseAllForCall = async (runner: QueryRunner, callId: string): Promise<void> => {
  await runner.query(
    `UPDATE call_participants
        SET status = 'left', left_at = COALESCE(left_at, now()), updated_at = now()
      WHERE call_id = $1
        AND status = ANY($2::call_participant_status[])`,
    [callId, OCCUPYING_PARTICIPANT_STATUSES],
  );
};

/**
 * Invites whose deadline has passed.
 *
 * `pending_approval` and `ringing` age from different clocks — the approval
 * wait starts when the invite is created, the ring wait when the professional
 * approved (which is the row's last update). Both are read in one pass so the
 * resolver stays a single query.
 */
export const findExpiredInvites = async (
  runner: QueryRunner,
  input: { approvalTimeoutSeconds: number; ringTimeoutSeconds: number; limit: number },
): Promise<CallParticipantRow[]> => {
  const res = await runner.query<CallParticipantRow>(
    `SELECT * FROM call_participants
      WHERE (status = 'pending_approval' AND created_at < now() - ($1 || ' seconds')::interval)
         OR (status = 'ringing'          AND updated_at < now() - ($2 || ' seconds')::interval)
      ORDER BY created_at ASC
      LIMIT $3
      FOR UPDATE SKIP LOCKED`,
    [input.approvalTimeoutSeconds, input.ringTimeoutSeconds, input.limit],
  );
  return res.rows;
};

/** Seats a user who has entered the channel. */
export const markJoined = async (
  runner: QueryRunner,
  callId: string,
  userId: string,
): Promise<void> => {
  await runner.query(
    `UPDATE call_participants
        SET status = 'joined', joined_at = COALESCE(joined_at, now()), updated_at = now()
      WHERE call_id = $1 AND user_id = $2 AND status <> 'joined'`,
    [callId, userId],
  );
};
