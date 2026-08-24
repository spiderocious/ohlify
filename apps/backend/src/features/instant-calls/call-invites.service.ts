import * as authRepo from '@features/auth/auth.repo.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { publish, RealtimeEvent } from '@lib/realtime/index.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';

import * as participantsRepo from './call-participants.repo.js';
import {
  CallParticipantRole,
  CallParticipantStatus,
  InviteUserRole,
  MAX_CALL_PARTICIPANTS,
  type CallParticipantRow,
  type CallParticipantView,
} from './call-participants.types.js';
import { CALL_INVITE_MESSAGES } from './instant-calls.messages.js';
import * as repo from './instant-calls.repo.js';
import { InstantCallStatus } from './instant-calls.types.js';

const toView = (
  row: CallParticipantRow & {
    name: string | null;
    avatar_url: string | null;
    handle: string | null;
  },
): CallParticipantView => ({
  user_id: row.user_id,
  role: row.role,
  status: row.status,
  name: row.name,
  avatar_url: row.avatar_url,
  handle: row.handle,
  invited_by: row.invited_by,
  joined_at: row.joined_at ? row.joined_at.toISOString() : null,
});

export const listParticipants = async (callId: string, viewerUserId: string) => {
  const call = await repo.findById(callId);
  if (!call) return new ServiceError('not_found', CALL_INVITE_MESSAGES.NOT_FOUND, 404);

  const rows = await participantsRepo.listForCallWithUsers(callId);
  if (!rows.some((r) => r.user_id === viewerUserId)) {
    return new ServiceError('forbidden', CALL_INVITE_MESSAGES.FORBIDDEN, 403);
  }
  return new ServiceSuccess(rows.map(toView), CALL_INVITE_MESSAGES.PARTICIPANTS_LISTED);
};

/**
 * A client invites a third person into a call they are paying for.
 *
 * Every rule here is a decision from the PRD, and each exists for a reason:
 *
 * - **Only the caller may invite.** They are the one being billed. A callee
 *   inviting would spend someone else's money.
 * - **Only clients may invite, and professionals may never be invited.** A
 *   professional-initiated invite would need a second approval path from the
 *   payer, for a case that barely happens.
 * - **The professional approves.** Someone on a paid consultation controls who
 *   is in the room. This is consent, not convenience.
 *
 * The invitee needs no wallet, no minutes, and no relationship with the
 * professional — the inviter's balance funds the whole call, which is why the
 * settlement math needs no change at all.
 */
export const invite = async (input: { callId: string; inviterUserId: string; email: string }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const call = await repo.findByIdForUpdate(client, input.callId);
    if (!call) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', CALL_INVITE_MESSAGES.NOT_FOUND, 404);
    }
    if (call.status !== InstantCallStatus.ACTIVE) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', CALL_INVITE_MESSAGES.ALREADY_RESOLVED, 409);
    }
    if (call.caller_user_id !== input.inviterUserId) {
      await client.query('ROLLBACK');
      return new ServiceError('forbidden', CALL_INVITE_MESSAGES.FORBIDDEN, 403);
    }

    const target = await findUserByEmail(client, input.email);
    if (!target) {
      // Succeeds even though nothing happened.
      //
      // A 404 here tells the caller whether an email has an Ohlify account —
      // an enumeration oracle anyone can query. Returning the same shape
      // whether or not the address exists removes the oracle entirely, rather
      // than leaving the rate limit as the only defence.
      //
      // The inviter is told an invite was sent "if an account exists", which
      // is true and gives them nothing to probe with.
      await client.query('ROLLBACK');
      return new ServiceSuccess(
        { participant_id: null, user_id: null, status: 'invited_if_exists' as const },
        CALL_INVITE_MESSAGES.CREATED,
      );
    }
    if (target.role === InviteUserRole.PROFESSIONAL) {
      await client.query('ROLLBACK');
      return new ServiceError('validation_error', CALL_INVITE_MESSAGES.INVALID_TARGET, 400, {
        email: ['Professionals cannot be invited to a call'],
      });
    }
    if (target.id === call.caller_user_id || target.id === call.callee_user_id) {
      await client.query('ROLLBACK');
      return new ServiceError('validation_error', CALL_INVITE_MESSAGES.INVALID_TARGET, 400, {
        email: ['That person is already in this call'],
      });
    }

    const occupied = await participantsRepo.countOccupying(client, call.id);
    if (occupied >= MAX_CALL_PARTICIPANTS) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', CALL_INVITE_MESSAGES.ROOM_FULL, 409);
    }

    if (await participantsRepo.isUserBusyElsewhere(client, target.id, call.id)) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', CALL_INVITE_MESSAGES.INVALID_TARGET, 409, {
        email: ['That person is already on another call'],
      });
    }

    const participant = await participantsRepo.create(client, {
      callId: call.id,
      userId: target.id,
      role: CallParticipantRole.INVITEE,
      status: CallParticipantStatus.PENDING_APPROVAL,
      invitedBy: input.inviterUserId,
    });

    // Same transaction as the participant row: the professional is only asked
    // to approve something that actually exists. SSE alone reaches them only
    // while the app is foregrounded — a decision this call is blocked on has
    // to survive a locked phone.
    // `findUserByEmail` returns only { id, role }; the push needs display
    // names, so both parties are re-read in full.
    const [inviter, invitee] = await Promise.all([
      authRepo.findUserById(input.inviterUserId),
      authRepo.findUserById(target.id),
    ]);
    await insertEvent(client, {
      aggregateType: OutboxAggregateType.CALL,
      aggregateId: call.id,
      eventType: OutboxEventType.PUSH_CALL_INVITE_REQUESTED,
      payload: {
        call_id: call.id,
        target_user_id: call.callee_user_id,
        participant_id: participant.id,
        inviter_user_id: input.inviterUserId,
        inviter_full_name: inviter?.full_name ?? 'Someone',
        invitee_user_id: target.id,
        invitee_full_name: invitee?.full_name ?? 'someone',
      },
    });

    await client.query('COMMIT');

    // To the PROFESSIONAL, over SSE — they decide, so they are the one told.
    publish(call.callee_user_id, {
      type: RealtimeEvent.CALL_INVITE_REQUESTED,
      data: { call_id: call.id, participant_id: participant.id, user_id: target.id },
    });

    return new ServiceSuccess(
      { participant_id: participant.id, user_id: target.id, status: participant.status },
      CALL_INVITE_MESSAGES.CREATED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, callId: input.callId }, 'call invite failed');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * The professional's ruling on an invite.
 *
 * The `from` guard on the transition is what makes this safe against the 30s
 * auto-decline firing at the same moment — exactly one of them updates a row.
 */
export const resolveInvite = async (input: {
  callId: string;
  participantId: string;
  professionalUserId: string;
  approve: boolean;
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const call = await repo.findByIdForUpdate(client, input.callId);
    if (!call) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', CALL_INVITE_MESSAGES.NOT_FOUND, 404);
    }
    if (call.callee_user_id !== input.professionalUserId) {
      await client.query('ROLLBACK');
      return new ServiceError('forbidden', CALL_INVITE_MESSAGES.FORBIDDEN, 403);
    }

    const participant = await participantsRepo.findByIdForUpdate(client, input.participantId);
    if (!participant || participant.call_id !== call.id) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', CALL_INVITE_MESSAGES.NOT_FOUND, 404);
    }

    const moved = await participantsRepo.transitionStatus(client, {
      participantId: participant.id,
      from: [CallParticipantStatus.PENDING_APPROVAL],
      to: input.approve ? CallParticipantStatus.RINGING : CallParticipantStatus.REJECTED,
    });
    if (!moved) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', CALL_INVITE_MESSAGES.ALREADY_RESOLVED, 409);
    }

    if (input.approve) {
      // Same transaction as the approval: the invitee's phone rings iff the
      // approval actually committed. SSE alone would miss a backgrounded app.
      const inviter = await authRepo.findUserById(call.caller_user_id);
      const ringExpiresAt = new Date(
        Date.now() + platformConfig.presence().invite_ring_timeout_seconds * 1000,
      );
      await insertEvent(client, {
        aggregateType: OutboxAggregateType.CALL,
        aggregateId: call.id,
        eventType: OutboxEventType.PUSH_CALL_INVITE,
        payload: {
          call_id: call.id,
          participant_id: participant.id,
          target_user_id: participant.user_id,
          inviter_user_id: call.caller_user_id,
          inviter_full_name: inviter?.full_name ?? 'Someone',
          inviter_avatar_url: inviter?.avatar_url ?? '',
          call_type: call.call_type,
          ring_expires_at: ringExpiresAt.toISOString(),
        },
      });
    }

    // Tell the INVITER either way. They asked for this and are waiting on it;
    // leaving them to infer the answer from whether a third tile appears is
    // how a declined invite reads as a broken app.
    const invitee = await authRepo.findUserById(participant.user_id);
    await insertEvent(client, {
      aggregateType: OutboxAggregateType.CALL,
      aggregateId: call.id,
      eventType: input.approve
        ? OutboxEventType.PUSH_CALL_INVITE_APPROVED
        : OutboxEventType.PUSH_CALL_INVITE_REJECTED,
      payload: {
        call_id: call.id,
        participant_id: participant.id,
        target_user_id: call.caller_user_id,
        invitee_user_id: participant.user_id,
        invitee_full_name: invitee?.full_name ?? 'They',
      },
    });

    await client.query('COMMIT');

    publish(call.caller_user_id, {
      type: RealtimeEvent.CALL_INVITE_RESOLVED,
      data: { call_id: call.id, participant_id: participant.id, status: moved.status },
    });
    if (input.approve) {
      // Only now does the invitee learn anything — a refused invite should
      // never surface to the person who was not let in.
      publish(participant.user_id, {
        type: RealtimeEvent.CALL_INCOMING,
        data: { call_id: call.id, participant_id: participant.id },
      });
    }

    return new ServiceSuccess(
      { participant_id: participant.id, status: moved.status },
      input.approve ? CALL_INVITE_MESSAGES.APPROVED : CALL_INVITE_MESSAGES.DECLINED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, participantId: input.participantId }, 'resolve invite failed');
    throw err;
  } finally {
    client.release();
  }
};

/** The invitee answers or refuses their ring. */
export const respondToRing = async (input: { callId: string; userId: string; accept: boolean }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const call = await repo.findByIdForUpdate(client, input.callId);
    if (!call) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', CALL_INVITE_MESSAGES.NOT_FOUND, 404);
    }

    const rows = await participantsRepo.listForCall(call.id);
    const mine = rows.find((r) => r.user_id === input.userId);
    if (!mine) {
      await client.query('ROLLBACK');
      return new ServiceError('forbidden', CALL_INVITE_MESSAGES.FORBIDDEN, 403);
    }

    const moved = await participantsRepo.transitionStatus(client, {
      participantId: mine.id,
      from: [CallParticipantStatus.RINGING],
      to: input.accept ? CallParticipantStatus.JOINED : CallParticipantStatus.DECLINED,
      setJoinedAt: input.accept,
      setLeftAt: !input.accept,
    });
    if (!moved) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', CALL_INVITE_MESSAGES.ALREADY_RESOLVED, 409);
    }

    // The call may have ended while their phone was ringing. Accepting into a
    // dead room would leave them in a channel nobody else is in.
    if (input.accept && call.status !== InstantCallStatus.ACTIVE) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', CALL_INVITE_MESSAGES.ALREADY_RESOLVED, 409);
    }

    await client.query('COMMIT');

    for (const peer of [call.caller_user_id, call.callee_user_id]) {
      publish(peer, {
        type: RealtimeEvent.CALL_PARTICIPANTS_CHANGED,
        data: { call_id: call.id, participant_id: mine.id, status: moved.status },
      });
    }

    return new ServiceSuccess(
      { participant_id: mine.id, status: moved.status },
      input.accept ? CALL_INVITE_MESSAGES.ACCEPTED : CALL_INVITE_MESSAGES.DECLINED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, callId: input.callId }, 'respond to ring failed');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Finds the person being invited, by email.
 *
 * Email rather than handle because **clients never set one**: `handle` is a
 * professional KYC item only, so most client accounts have none — and clients
 * are the only people who can be invited. Handle lookup was unusable for its
 * own target audience.
 *
 * Case-insensitive: registration does not normalise email, so `Bode@x.com` and
 * `bode@x.com` are both stored as typed and either must resolve.
 *
 * This endpoint reveals whether an address has an account, which is why the
 * route carries a tight per-user rate limit. Do not remove it.
 */
const findUserByEmail = async (
  runner: { query: typeof pool.query },
  email: string,
): Promise<{ id: string; role: string } | null> => {
  const res = await runner.query<{ id: string; role: string }>(
    `SELECT id, role FROM users
      WHERE lower(email) = lower($1) AND deleted_at IS NULL
      LIMIT 1`,
    [email.trim()],
  );
  return res.rows[0] ?? null;
};

/**
 * Retires invites nobody acted on.
 *
 * An unanswered approval auto-DECLINES rather than auto-approving: silence is
 * not consent, and the professional controls their own room. An unanswered ring
 * simply EXPIRES — the call carries on with the original two, because a paid
 * conversation should not stall on a third party's phone.
 *
 * Both moves are guarded transitions, so a professional tapping Approve in the
 * same instant wins or loses cleanly rather than racing.
 */
export const expireStaleInvites = async (limit = 50): Promise<number> => {
  const cfg = platformConfig.presence();
  const client = await pool.connect();
  let resolved = 0;
  try {
    await client.query('BEGIN');
    const rows = await participantsRepo.findExpiredInvites(client, {
      approvalTimeoutSeconds: cfg.invite_approval_timeout_seconds,
      ringTimeoutSeconds: cfg.invite_ring_timeout_seconds,
      limit,
    });

    for (const row of rows) {
      const wasAwaitingApproval = row.status === CallParticipantStatus.PENDING_APPROVAL;
      const moved = await participantsRepo.transitionStatus(client, {
        participantId: row.id,
        from: [row.status],
        to: wasAwaitingApproval ? CallParticipantStatus.REJECTED : CallParticipantStatus.EXPIRED,
        setLeftAt: true,
      });
      if (!moved) continue;
      resolved += 1;

      const call = await repo.findById(row.call_id);
      if (!call) continue;
      // The inviter is told either way — they are the one waiting on an answer.
      publish(call.caller_user_id, {
        type: RealtimeEvent.CALL_INVITE_RESOLVED,
        data: { call_id: call.id, participant_id: row.id, status: moved.status },
      });
      if (!wasAwaitingApproval) {
        publish(row.user_id, {
          type: RealtimeEvent.CALL_CANCELLED,
          data: { call_id: call.id, participant_id: row.id },
        });
      }
    }

    await client.query('COMMIT');
    if (resolved > 0) logger.info({ resolved }, 'expired stale call invites');
    return resolved;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err }, 'expire stale invites failed');
    return 0;
  } finally {
    client.release();
  }
};
