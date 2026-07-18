import { resolveReachability, ReachabilityReason } from '@features/presence/index.js';
import * as minutesRepo from '@features/minutes/minutes.repo.js';
import { agoraUidForUserId, issueAgoraRtcToken } from '@lib/agora/index.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { withTransaction } from '@lib/db/tx.js';
import { koboToJson } from '@lib/money.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { settleMinutes } from '@lib/wallet/flows/minutes-settle.js';

import { INSTANT_CALL_MESSAGES } from './instant-calls.messages.js';
import * as repo from './instant-calls.repo.js';
import type { StartCallDto } from './instant-calls.schema.js';
import {
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
    minutes_allotted: call.minutes_allotted,
    max_seconds: call.minutes_allotted * 60,
  };
};

const toView = (row: InstantCallRow): InstantCallView => ({
  call_id: row.id,
  caller_user_id: row.caller_user_id,
  callee_user_id: row.callee_user_id,
  call_type: row.call_type,
  status: row.status,
  per_minute_kobo: koboToJson(BigInt(row.per_minute_kobo)),
  minutes_allotted: row.minutes_allotted,
  connected_seconds: row.connected_seconds,
  settled_kobo: koboToJson(BigInt(row.settled_kobo)),
  connected_at: row.connected_at ? row.connected_at.toISOString() : null,
  ended_at: row.ended_at ? row.ended_at.toISOString() : null,
  created_at: row.created_at.toISOString(),
});

const reasonToError = (reason: ReachabilityReason): ServiceError => {
  switch (reason) {
    case ReachabilityReason.OFFLINE:
      return new ServiceError('professional_unavailable', INSTANT_CALL_MESSAGES.OFFLINE, 409);
    case ReachabilityReason.NOT_ACCEPTING:
      return new ServiceError('professional_unavailable', INSTANT_CALL_MESSAGES.NOT_ACCEPTING, 409);
    case ReachabilityReason.DND:
      return new ServiceError('professional_unavailable', INSTANT_CALL_MESSAGES.DND, 409);
    default:
      return new ServiceError('professional_unavailable', INSTANT_CALL_MESSAGES.OFFLINE, 409);
  }
};

// Start an instant call: run the preflight (minutes / online / DnD), then
// create the ringing call and return the caller's join credentials.
export const startCall = async (dto: StartCallDto, callerUserId: string) => {
  if (dto.professional_id === callerUserId) {
    return new ServiceError('cannot_book_self', INSTANT_CALL_MESSAGES.CANNOT_CALL_SELF, 422);
  }

  // Gate 1: minutes for this pro + call type.
  const balance = await minutesRepo.findBalance(callerUserId, dto.professional_id, dto.call_type);
  if (!balance || balance.minutes_remaining <= 0) {
    return new ServiceError('insufficient_balance', INSTANT_CALL_MESSAGES.NO_MINUTES, 409);
  }

  // Gates 2 + 3: online + accepting + not in a DnD block.
  const { reason } = await resolveReachability(dto.professional_id);
  if (reason !== ReachabilityReason.OK) {
    return reasonToError(reason);
  }

  // Create the ringing call. The unique partial index rejects a second live
  // call for the same callee (23505) — surface as busy.
  try {
    const call = await withTransaction((client) =>
      repo.create(client, {
        callerUserId,
        calleeUserId: dto.professional_id,
        callType: dto.call_type,
        perMinuteKobo: BigInt(balance.rate_snapshot_kobo),
        minutesAllotted: balance.minutes_remaining,
      }),
    );
    return new ServiceSuccess(
      buildJoinView(call, callerUserId, dto.professional_id),
      INSTANT_CALL_MESSAGES.STARTED,
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return new ServiceError('professional_unavailable', INSTANT_CALL_MESSAGES.BUSY, 409);
    }
    throw err;
  }
};

// Callee answers a ringing call → flips to active, returns their join creds.
export const answerCall = async (callId: string, calleeUserId: string) => {
  return withTransaction(async (client) => {
    const call = await repo.findByIdForUpdate(client, callId);
    if (!call) return new ServiceError('call_not_found', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
    if (call.callee_user_id !== calleeUserId) {
      return new ServiceError('forbidden', INSTANT_CALL_MESSAGES.NOT_FOUND, 404);
    }
    if (call.status !== InstantCallStatus.RINGING) {
      return new ServiceError('call_not_joinable', INSTANT_CALL_MESSAGES.NOT_RINGING, 409);
    }
    await repo.markActive(client, callId);
    const updated = (await repo.findByIdForUpdate(client, callId))!;
    return new ServiceSuccess(
      buildJoinView(updated, calleeUserId, updated.caller_user_id),
      INSTANT_CALL_MESSAGES.ANSWERED,
    );
  });
};

// The callee's incoming (ringing) call, if any — foreground poll.
export const getIncoming = async (calleeUserId: string) => {
  const row = await repo.findLiveForCallee(calleeUserId);
  const data =
    row && row.status === InstantCallStatus.RINGING
      ? {
          call_id: row.id,
          caller_user_id: row.caller_user_id,
          call_type: row.call_type,
          agora_channel_name: row.agora_channel_name,
        }
      : null;
  return new ServiceSuccess(data, INSTANT_CALL_MESSAGES.INCOMING_FETCHED);
};

// End a call. `reason` distinguishes a normal hangup (settle for talked time)
// from an unanswered/cancelled ring (no charge). connectedSeconds is the
// client-reported talk time, clamped to the minutes cap.
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
      const status =
        userId === call.caller_user_id ? InstantCallStatus.CANCELLED : InstantCallStatus.MISSED;
      await repo.finalize(client, {
        callId,
        status,
        connectedSeconds: 0,
        settledKobo: 0n,
        settlementJournalId: null,
      });
      const updated = (await repo.findByIdForUpdate(client, callId))!;
      return new ServiceSuccess(toView(updated), INSTANT_CALL_MESSAGES.ENDED);
    }

    // Active → meter + settle. Cap talk time at the minutes allotment.
    const capSeconds = call.minutes_allotted * 60;
    const talkedSeconds = Math.max(0, Math.min(connectedSeconds, capSeconds));

    // Bill per second, floored to whole minutes for deduction (system-wide floor).
    const minBillable = platformConfig.wallet().min_billable_seconds;
    const billedMinutes = talkedSeconds < minBillable ? 0 : Math.floor(talkedSeconds / 60);
    const perMin = BigInt(call.per_minute_kobo);
    const amountKobo = perMin * BigInt(billedMinutes);

    let settlementJournalId: string | null = null;
    if (amountKobo > 0n) {
      const feeBps = platformConfig.wallet().platform_fee_bps;
      const settle = await settleMinutes(client, {
        callId,
        payeeUserId: call.callee_user_id,
        amountKobo,
        feeBps,
      });
      settlementJournalId = settle.journalId;

      // Deduct the consumed minutes + escrow from the caller's balance.
      await minutesRepo.consumeMinutes(client, {
        userId: call.caller_user_id,
        professionalId: call.callee_user_id,
        callType: call.call_type,
        minutes: billedMinutes,
        escrowKobo: amountKobo,
      });
    }

    await repo.finalize(client, {
      callId,
      status: InstantCallStatus.ENDED,
      connectedSeconds: talkedSeconds,
      settledKobo: amountKobo,
      settlementJournalId,
    });
    const updated = (await repo.findByIdForUpdate(client, callId))!;
    return new ServiceSuccess(toView(updated), INSTANT_CALL_MESSAGES.ENDED);
  });
};

// pg unique_violation → 23505.
const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
