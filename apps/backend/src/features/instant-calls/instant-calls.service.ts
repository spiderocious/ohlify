import * as authRepo from '@features/auth/auth.repo.js';
import type { CallType } from '@features/bookings/bookings.types.js';
import * as eventsRepo from '@features/call-session-events/call-session-events.repo.js';
import { recordCallEvent } from '@features/chat/chat.service.js';
import { CallEventOutcome } from '@features/chat/chat.types.js';
import { DurationEvent } from '@features/call-session-events/duration.js';
import {
  resolveReachability,
  ReachabilityReason,
  type ReachabilityDetail,
} from '@features/presence/index.js';
import * as minutesRepo from '@features/minutes/minutes.repo.js';
import { agoraUidForUserId, issueAgoraRtcToken } from '@lib/agora/index.js';

import * as participantsRepo from './call-participants.repo.js';
import { CallParticipantRole, CallParticipantStatus } from './call-participants.types.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { withTransaction } from '@lib/db/tx.js';
import { logger } from '@lib/logger.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { koboToJson } from '@lib/money.js';
import { computePlatformFee } from '@lib/wallet/accounting.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { nowUtc } from '@lib/time.js';
import type { MessageKey } from '@shared/constants/message-keys.js';

import { INSTANT_CALL_MESSAGES } from './instant-calls.messages.js';
import * as repo from './instant-calls.repo.js';
import { settleActiveCall } from './instant-calls.settlement.js';
import type { StartCallDto } from './instant-calls.schema.js';
import {
  INSTANT_CALL_RING_SECONDS,
  InstantCallStatus,
  type InstantCallJoinView,
  type InstantCallRow,
  type InstantCallView,
} from './instant-calls.types.js';

const buildJoinView = (
  call: InstantCallRow,
  viewerUserId: string,
  remoteUserId: string,
): InstantCallJoinView => {
  const cfg = platformConfig.bookings();
  const token = issueAgoraRtcToken({
    channelName: call.agora_channel_name,
    uid: agoraUidForUserId(viewerUserId),
    role: 'publisher',
    expiresInSeconds: cfg.token_expires_seconds,
  });
  return {
    call_id: call.id,
    status: call.status,
    agora_app_id: token.appId,
    agora_channel_name: call.agora_channel_name,
    agora_uid: token.uid,
    agora_token: token.token,
    expires_at: token.expiresAt.toISOString(),
    call_type: call.call_type,
    remote_user_id: remoteUserId,
    per_minute_kobo: koboToJson(BigInt(call.per_minute_kobo)),
    seconds_allotted: call.seconds_allotted,
    max_seconds: call.seconds_allotted,
    minutes_allotted: Math.floor(call.seconds_allotted / 60),
  };
};

const toView = (row: InstantCallRow): InstantCallView => ({
  call_id: row.id,
  caller_user_id: row.caller_user_id,
  callee_user_id: row.callee_user_id,
  call_type: row.call_type,
  status: row.status,
  per_minute_kobo: koboToJson(BigInt(row.per_minute_kobo)),
  seconds_allotted: row.seconds_allotted,
  connected_seconds: row.connected_seconds,
  settled_kobo: koboToJson(BigInt(row.settled_kobo)),
  connected_at: row.connected_at ? row.connected_at.toISOString() : null,
  ended_at: row.ended_at ? row.ended_at.toISOString() : null,
  rejection_reason: row.rejection_reason,
  created_at: row.created_at.toISOString(),
});

/**
 * GET /instant-calls/history — this user's instant calls, either side.
 *
 * Separate from `/calls/history`, which INNER JOINs `bookings` and therefore
 * only ever returns scheduled calls. Instant calls have no booking, so without
 * this they appear nowhere — including the `rejected` attempts that never rang.
 */
export const listHistory = async (
  userId: string,
  limit: number | undefined,
  cursorRaw?: string,
) => {
  const lim = resolveLimit(limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (cursorRaw !== undefined) {
    try {
      cursor = decodeCursor(cursorRaw);
    } catch {
      return new ServiceError('validation_error', INSTANT_CALL_MESSAGES.HISTORY_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }

  const rows = await repo.listHistoryForUser({
    userId,
    limit: lim + 1,
    ...(cursor ? { cursor } : {}),
  });
  const hasMore = rows.length > lim;
  const page = hasMore ? rows.slice(0, lim) : rows;
  const last = page[page.length - 1];

  return new ServiceSuccess(
    {
      items: page.map(toView),
      meta: {
        next_cursor:
          hasMore && last
            ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
            : null,
        has_more: hasMore,
      },
    },
    INSTANT_CALL_MESSAGES.HISTORY_FETCHED,
  );
};

/**
 * GET /instant-calls/:id/earnings — what the professional actually made.
 *
 * Derived from the SETTLED figures on the row plus the fee rate that applied,
 * rather than recomputed from duration: recomputing would drift from the
 * ledger the moment rounding, a cap, or a partial escrow came into play, and a
 * receipt that disagrees with the wallet is worse than no receipt.
 *
 * Payee-only. The client sees a rating screen, not a breakdown of what the
 * professional was paid.
 */
export const getCallEarnings = async (callId: string, userId: string) => {
  const call = await repo.findById(callId);
  if (!call) {
    return new ServiceError('call_not_found', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
  }
  if (call.callee_user_id !== userId) {
    // 404 rather than 403: a caller should not learn that an earnings record
    // exists for a call they were on.
    return new ServiceError('not_found', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
  }

  const grossKobo = BigInt(call.settled_kobo);
  const feeBps = platformConfig.wallet().platform_fee_bps;
  const feeKobo = BigInt(computePlatformFee(Number(grossKobo), feeBps));
  const netKobo = grossKobo - feeKobo;

  const caller = await authRepo.findUserById(call.caller_user_id);

  return new ServiceSuccess(
    {
      call_id: call.id,
      call_type: call.call_type,
      status: call.status,
      connected_seconds: call.connected_seconds,
      peer_name: caller?.full_name ?? null,
      peer_avatar_url: caller?.avatar_url ?? null,
      gross_kobo: koboToJson(grossKobo),
      platform_fee_kobo: koboToJson(feeKobo),
      net_kobo: koboToJson(netKobo),
      fee_bps: feeBps,
      /// Null when nothing was billable — a call that never connected settles
      /// no money and writes no journal, and showing a receipt id for one
      /// would imply a payment that never happened.
      settlement_journal_id: call.settlement_journal_id,
      wallet_credited: call.settlement_journal_id !== null && netKobo > 0n,
      ended_at: call.ended_at ? call.ended_at.toISOString() : null,
    },
    INSTANT_CALL_MESSAGES.HISTORY_FETCHED,
  );
};

const REASON_MESSAGES: Record<ReachabilityReason, MessageKey> = {
  [ReachabilityReason.OK]: INSTANT_CALL_MESSAGES.OFFLINE,
  [ReachabilityReason.OFFLINE]: INSTANT_CALL_MESSAGES.OFFLINE,
  [ReachabilityReason.UNREACHABLE]: INSTANT_CALL_MESSAGES.OFFLINE,
  [ReachabilityReason.NOT_ACCEPTING]: INSTANT_CALL_MESSAGES.NOT_ACCEPTING,
  [ReachabilityReason.DND]: INSTANT_CALL_MESSAGES.DND,
  [ReachabilityReason.BUSY]: INSTANT_CALL_MESSAGES.BUSY,
};

/**
 * `professional_unavailable` covers several distinct outcomes — the preflight
 * branches, three of which used to hide behind one `offline` message.
 * `rejectionReason` carries which one it actually was.
 *
 * The lost-race outcome is gone: with the one-live-call indexes dropped
 * (migration 0104) two callers can no longer collide on the same callee.
 */
const reasonToError = (reason: ReachabilityReason, detail?: ReachabilityDetail): ServiceError =>
  new ServiceError(
    'professional_unavailable',
    REASON_MESSAGES[reason],
    409,
    undefined,
    undefined,
    detail,
  );

/**
 * Journals an attempt that never rang, and tells the professional someone
 * tried to reach them.
 *
 * Swallows its own failures on purpose. The caller is being told
 * `professional_unavailable` regardless; letting a bookkeeping error turn that
 * into a 500 would make an ordinary "they're offline" look like an outage.
 */
const recordRejectedAttempt = async (input: {
  callerUserId: string;
  calleeUserId: string;
  callType: CallType;
  perMinuteKobo: bigint;
  reason: string;
}): Promise<void> => {
  try {
    const caller = await authRepo.findUserById(input.callerUserId);
    await withTransaction(async (client) => {
      const row = await repo.createRejectedAttempt(client, {
        callerUserId: input.callerUserId,
        calleeUserId: input.calleeUserId,
        callType: input.callType,
        perMinuteKobo: input.perMinuteKobo,
        rejectionReason: input.reason,
      });
      // Same transaction as the row: the professional is only told about an
      // attempt that was actually recorded, so the notification always has a
      // history entry to deep-link into.
      await insertEvent(client, {
        aggregateType: OutboxAggregateType.CALL,
        aggregateId: row.id,
        eventType: OutboxEventType.PUSH_CALL_MISSED,
        payload: {
          call_id: row.id,
          target_user_id: input.calleeUserId,
          caller_user_id: input.callerUserId,
          caller_full_name: caller?.full_name ?? null,
          caller_avatar_url: caller?.avatar_url ?? null,
          call_type: input.callType,
          rejection_reason: input.reason,
        },
      });
    });
  } catch (err) {
    logger.warn(
      { err, calleeUserId: input.calleeUserId, reason: input.reason },
      'failed to record rejected call attempt',
    );
  }
};

// Start an instant call: run the preflight (minutes / online / DnD), then
// create the ringing call and return the caller's join credentials.
export const startCall = async (dto: StartCallDto, callerUserId: string) => {
  if (dto.professional_id === callerUserId) {
    return new ServiceError('cannot_book_self', INSTANT_CALL_MESSAGES.CANNOT_CALL_SELF, 422);
  }

  // Gate 1: prepaid time with this pro for this call type.
  const balance = await minutesRepo.findBalance(callerUserId, dto.professional_id, dto.call_type);
  if (!balance || balance.seconds_remaining <= 0) {
    return new ServiceError('insufficient_balance', INSTANT_CALL_MESSAGES.NO_MINUTES, 409);
  }

  // Gates 2 + 3: online + accepting + not in a DnD block.
  const { reason, detail } = await resolveReachability(dto.professional_id);
  if (reason !== ReachabilityReason.OK) {
    // Record the attempt before returning. Previously this path left no trace
    // at all, so a professional who was offline never learned anyone had tried
    // to reach them, and neither party's call history showed it.
    //
    // Best-effort: the caller's error is the same either way, so a failure to
    // journal must not turn a clean "unavailable" into a 500.
    await recordRejectedAttempt({
      callerUserId,
      calleeUserId: dto.professional_id,
      callType: dto.call_type,
      perMinuteKobo: BigInt(balance.rate_snapshot_kobo),
      reason: detail ?? reason,
    });
    return reasonToError(reason, detail);
  }

  // Caller identity rides in the push payload so the callee's ring UI can
  // render a name/avatar without a round-trip.
  const caller = await authRepo.findUserById(callerUserId);

  // Create the ringing call. The unique partial index rejects a second live
  // call for the same callee (23505) — surface as busy.
  try {
    const call = await withTransaction(async (client) => {
      const created = await repo.create(client, {
        callerUserId,
        calleeUserId: dto.professional_id,
        callType: dto.call_type,
        perMinuteKobo: BigInt(balance.rate_snapshot_kobo),
        secondsAllotted: balance.seconds_remaining,
      });
      // Both original parties become participant rows in the same transaction
      // as the call. The two columns on `instant_calls` stay authoritative for
      // settlement; these rows are what the roster and the one-live-per-user
      // rule read, and a call without them would be invisible to both.
      await participantsRepo.create(client, {
        callId: created.id,
        userId: callerUserId,
        role: CallParticipantRole.CALLER,
        status: CallParticipantStatus.JOINED,
      });
      await participantsRepo.create(client, {
        callId: created.id,
        userId: dto.professional_id,
        role: CallParticipantRole.CALLEE,
        status: CallParticipantStatus.RINGING,
      });
      // Same tx as the insert: the wake-up push only fires iff the ringing
      // row commits. Delivery is the outbox worker's problem (retries).
      await insertEvent(client, {
        aggregateType: OutboxAggregateType.CALL,
        aggregateId: created.id,
        eventType: OutboxEventType.PUSH_INCOMING_CALL,
        payload: {
          call_id: created.id,
          target_user_id: dto.professional_id,
          caller_user_id: callerUserId,
          caller_full_name: caller?.full_name ?? null,
          caller_avatar_url: caller?.avatar_url ?? null,
          call_type: dto.call_type,
          ring_expires_at: new Date(
            created.created_at.getTime() + INSTANT_CALL_RING_SECONDS * 1000,
          ).toISOString(),
        },
      });
      return created;
    });
    return new ServiceSuccess(
      buildJoinView(call, callerUserId, dto.professional_id),
      INSTANT_CALL_MESSAGES.STARTED,
    );
  } catch (err) {
    // The lost-race branch that used to live here is gone with migration 0104:
    // the one-live-call unique indexes were dropped, so a concurrent insert no
    // longer collides. Any 23505 reaching here now is a genuine constraint bug
    // and must surface rather than be dressed up as "the pro is busy".
    throw err;
  }
};

// Callee answers a ringing call → flips to active, returns their join creds.
/**
 * Answers a ringing call, optionally ending whichever call the callee is
 * already on.
 *
 * Concurrent calls are allowed (migration 0104), so a second call now rings
 * alongside the first and the callee chooses. `endOngoing` is that choice:
 * "answer and end the current one", the option every phone has offered for
 * twenty years.
 *
 * Both happen in ONE transaction. Settling the old call and joining the new
 * one separately would leave a window where the callee is billed for two
 * simultaneous calls, or — worse on a crash between them — where the old call
 * is abandoned unsettled with money still in escrow.
 */
export const answerCall = async (
  callId: string,
  calleeUserId: string,
  options: { endOngoing?: boolean } = {},
) => {
  return withTransaction(async (client) => {
    if (options.endOngoing === true) {
      // Every OTHER live call this user is on, settled for the time actually
      // talked. Usually one; the loop is because nothing structurally caps it
      // any more now the unique index is gone.
      const live = await repo.findLiveForCalleeAll(client, calleeUserId);
      for (const other of live) {
        if (other.id === callId) continue;
        if (other.status === InstantCallStatus.ACTIVE) {
          await settleActiveCall(client, other, other.connected_seconds);
        } else {
          // Still ringing: no time was talked, so there is nothing to bill.
          await repo.markCancelled(client, other.id);
        }
        await participantsRepo.releaseAllForCall(client, other.id);
        // Stop the other party's UI dead rather than leaving them staring at a
        // call the callee has already left.
        await insertEvent(client, {
          aggregateType: OutboxAggregateType.CALL,
          aggregateId: other.id,
          eventType: OutboxEventType.PUSH_CALL_CANCELLED,
          payload: {
            call_id: other.id,
            target_user_id: other.caller_user_id,
            reason: 'callee_answered_another_call',
          },
        });
      }
    }

    const call = await repo.findByIdForUpdate(client, callId);
    if (!call) return new ServiceError('call_not_found', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
    if (call.callee_user_id !== calleeUserId) {
      return new ServiceError('forbidden', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
    }
    if (call.status !== InstantCallStatus.RINGING) {
      return new ServiceError('call_not_joinable', INSTANT_CALL_MESSAGES.NOT_RINGING, 409);
    }
    await repo.markActive(client, callId);
    await participantsRepo.markJoined(client, callId, calleeUserId);
    // Dismiss the ring on the callee's OTHER devices (answered here).
    await insertEvent(client, {
      aggregateType: OutboxAggregateType.CALL,
      aggregateId: callId,
      eventType: OutboxEventType.PUSH_CALL_CANCELLED,
      payload: { call_id: callId, target_user_id: calleeUserId, reason: 'answered_elsewhere' },
    });
    const updated = (await repo.findByIdForUpdate(client, callId))!;
    return new ServiceSuccess(
      buildJoinView(updated, calleeUserId, updated.caller_user_id),
      INSTANT_CALL_MESSAGES.ANSWERED,
    );
  });
};

/**
 * Suspends metering when the caller runs out of prepaid time.
 *
 * Writing the pause into the call-app's own event log is what makes it real:
 * settlement derives duration from that log, so time spent staring at a top-up
 * overlay is excluded from the charge without the settlement path needing to
 * know the pause happened.
 *
 * Either party may pause — the caller when their balance empties, the callee's
 * client when it observes the same — and repeats are harmless, since the
 * derivation collapses consecutive pauses.
 */
export const pauseCall = async (callId: string, userId: string) =>
  recordMeterEvent(callId, userId, DurationEvent.PAUSED, INSTANT_CALL_MESSAGES.PAUSED);

/**
 * Resumes metering after a verified top-up.
 *
 * Deliberately does not re-check the balance: the caller's guard is the
 * intent's `verify`, and duplicating the check here would let a rounding
 * disagreement between the two strand a call that was legitimately topped up.
 */
export const resumeCall = async (callId: string, userId: string) =>
  recordMeterEvent(callId, userId, DurationEvent.RESUMED, INSTANT_CALL_MESSAGES.RESUMED);

const recordMeterEvent = async (
  callId: string,
  userId: string,
  event: DurationEvent,
  message: MessageKey,
) => {
  const call = await repo.findById(callId);
  if (!call) return new ServiceError('call_not_found', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
  if (call.caller_user_id !== userId && call.callee_user_id !== userId) {
    return new ServiceError('forbidden', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
  }
  if (call.status !== InstantCallStatus.ACTIVE) {
    return new ServiceError('call_not_joinable', INSTANT_CALL_MESSAGES.NOT_ACTIVE, 409);
  }

  await eventsRepo.insertEvent({
    call_id: callId,
    call_reference: null,
    event,
    payload: { source: 'server', actor_user_id: userId },
    occurred_at: nowUtc(),
  });

  return new ServiceSuccess({ call_id: callId, event }, message);
};

// End a call. A hangup mid-conversation settles for the time the call-app's
// event log says was talked; ending while it was still ringing charges nothing.
// `connectedSeconds` is what the client believes it used — recorded for
// reconciliation, never trusted as the basis for the charge.
export const endCall = async (callId: string, userId: string, connectedSeconds: number) => {
  return withTransaction(async (client) => {
    const call = await repo.findByIdForUpdate(client, callId);
    if (!call) return new ServiceError('call_not_found', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
    if (call.caller_user_id !== userId && call.callee_user_id !== userId) {
      return new ServiceError('forbidden', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
    }

    // Already finalized → idempotent no-op.
    if (
      call.status === InstantCallStatus.ENDED ||
      call.status === InstantCallStatus.MISSED ||
      call.status === InstantCallStatus.CANCELLED
    ) {
      return new ServiceSuccess(toView(call), INSTANT_CALL_MESSAGES.ENDED);
    }

    // Ended while still ringing → nobody connected → missed/cancelled, no charge.
    if (call.status === InstantCallStatus.RINGING) {
      const isCaller = userId === call.caller_user_id;
      const status = isCaller ? InstantCallStatus.CANCELLED : InstantCallStatus.MISSED;
      await repo.finalize(client, {
        callId,
        status,
        connectedSeconds: 0,
        settledKobo: 0n,
        settlementJournalId: null,
      });
      // Kill the ring on every callee device (caller hung up / callee
      // declined on one of several devices).
      await insertEvent(client, {
        aggregateType: OutboxAggregateType.CALL,
        aggregateId: callId,
        eventType: OutboxEventType.PUSH_CALL_CANCELLED,
        payload: {
          call_id: callId,
          target_user_id: call.callee_user_id,
          reason: isCaller ? 'cancelled' : 'declined',
        },
      });
      // Callee declined → the caller's dialing UI needs to stop too.
      if (!isCaller) {
        await insertEvent(client, {
          aggregateType: OutboxAggregateType.CALL,
          aggregateId: callId,
          eventType: OutboxEventType.PUSH_CALL_CANCELLED,
          payload: { call_id: callId, target_user_id: call.caller_user_id, reason: 'declined' },
        });
      }
      // An unanswered ring is still part of their conversation — WhatsApp
      // shows these, and a missed call with no trace is how people miss them
      // twice.
      await recordCallEvent(client, {
        clientUserId: call.caller_user_id,
        professionalId: call.callee_user_id,
        callerUserId: call.caller_user_id,
        callId,
        callType: call.call_type,
        outcome: isCaller ? CallEventOutcome.CANCELLED : CallEventOutcome.DECLINED,
      });
      const updated = (await repo.findByIdForUpdate(client, callId))!;
      return new ServiceSuccess(toView(updated), INSTANT_CALL_MESSAGES.ENDED);
    }

    await settleActiveCall(client, call, Math.max(0, connectedSeconds));
    const updated = (await repo.findByIdForUpdate(client, callId))!;
    return new ServiceSuccess(toView(updated), INSTANT_CALL_MESSAGES.ENDED);
  });
};
