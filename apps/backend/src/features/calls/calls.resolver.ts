import type { PoolClient } from 'pg';

import * as bookingsRepo from '@features/bookings/bookings.repo.js';
import { type BookingRow } from '@features/bookings/bookings.types.js';
import { maybeIssueStrike } from '@features/strikes/strikes.service.js';
import { StrikeReason } from '@features/strikes/strikes.types.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { accountFor } from '@lib/wallet/accounts.js';
import { postJournal } from '@lib/wallet/journal.js';

import * as repo from './calls.repo.js';
import { CallStatus, type CallRow } from './calls.types.js';

interface QueryRunner {
  query: PoolClient['query'];
}

// ── Pure helpers ────────────────────────────────────────────────────────────

// Connected seconds = max overlap of caller's + callee's joined intervals.
// Network flap handled at a higher level (we don't see flap events here).
export const computeConnectedSeconds = (
  callerJoined: Date | null,
  callerLeft: Date | null,
  calleeJoined: Date | null,
  calleeLeft: Date | null,
  fallbackEndAt: Date,
): number => {
  if (!callerJoined || !calleeJoined) return 0;
  const start = Math.max(callerJoined.getTime(), calleeJoined.getTime());
  // If a side hasn't left, treat their leave as the fallback (now or scheduled end).
  const end = Math.min(
    callerLeft ? callerLeft.getTime() : fallbackEndAt.getTime(),
    calleeLeft ? calleeLeft.getTime() : fallbackEndAt.getTime(),
  );
  if (end <= start) return 0;
  return Math.floor((end - start) / 1000);
};

export interface SettlementBreakdown {
  payeeCreditKobo: bigint;
  platformCreditKobo: bigint;
  callerRefundKobo: bigint;
  // The actual call_settlement journal lines (sums to zero):
  //   payee +payeeCredit
  //   platform_revenue +platformCredit
  //   pending_debits_pool -(payeeCredit + platformCredit)
  //
  // The refund (if > 0) is a separate journal:
  //   user_wallet(caller) +callerRefund
  //   pending_debits_pool -callerRefund
  //
  // Combined they release the whole reservation.
  totalReleasedKobo: bigint; // = payeeCredit + platformCredit + callerRefund. Must equal booking.total_paid_kobo.
}

// Compute how to split the reservation given a terminal call status. Encodes
// the architecture doc §6 table.
export const computeSettlement = (
  booking: BookingRow,
  call: CallRow,
  status: CallStatus,
): SettlementBreakdown => {
  const total = BigInt(booking.total_paid_kobo);
  const payeeFull = BigInt(booking.payee_amount_kobo);
  const feeFull = BigInt(booking.platform_fee_kobo);

  const cfg = platformConfig.wallet();
  const scheduledSeconds = booking.duration_minutes * 60;

  const noPayout: SettlementBreakdown = {
    payeeCreditKobo: 0n,
    platformCreditKobo: 0n,
    callerRefundKobo: total,
    totalReleasedKobo: total,
  };

  switch (status) {
    case CallStatus.NO_SHOW_BOTH:
    case CallStatus.NO_SHOW_CALLEE:
      // Caller waited, pro didn't show. Full refund. No fee. Strike the pro.
      return noPayout;

    case CallStatus.NO_SHOW_CALLER: {
      // Pro waited, caller didn't show. Configurable split.
      const refundBps = BigInt(cfg.caller_no_show_refund_pct_bps);
      const payeeBps = BigInt(cfg.caller_no_show_payee_pct_bps);
      // Defensive: if config is misconfigured (doesn't sum to 100%), normalize.
      const refundKobo = (total * refundBps) / 10000n;
      const payeeCredit = (payeeFull * payeeBps) / 10000n;
      const platformCredit = (feeFull * payeeBps) / 10000n;
      const released = refundKobo + payeeCredit + platformCredit;
      // Any rounding leftover goes to the caller as refund (kindest path).
      const adj = total - released;
      return {
        payeeCreditKobo: payeeCredit,
        platformCreditKobo: platformCredit,
        callerRefundKobo: refundKobo + (adj > 0n ? adj : 0n),
        totalReleasedKobo: total,
      };
    }

    case CallStatus.COMPLETED:
    case CallStatus.DISCONNECTED_CALLER:
    case CallStatus.DISCONNECTED_CALLEE: {
      // Pro-rate by connected seconds. Below min_billable, treat as caller no-show
      // semantics (no service rendered).
      if (call.connected_seconds < cfg.min_billable_seconds) {
        return noPayout;
      }
      const fracNum = BigInt(Math.min(call.connected_seconds, scheduledSeconds));
      const fracDen = BigInt(scheduledSeconds);
      const payeeCredit = (payeeFull * fracNum) / fracDen;
      const platformCredit = (feeFull * fracNum) / fracDen;
      const callerRefund = total - payeeCredit - platformCredit;
      return {
        payeeCreditKobo: payeeCredit,
        platformCreditKobo: platformCredit,
        callerRefundKobo: callerRefund < 0n ? 0n : callerRefund,
        totalReleasedKobo: total,
      };
    }

    default:
      // scheduled / waiting / in_progress — not terminal. Caller of this
      // helper should never invoke for these.
      throw new Error(`computeSettlement called on non-terminal status ${status}`);
  }
};

// ── Resolution: post journals + flip statuses + emit events ─────────────────

export type ResolveReason = 'both_left' | 'no_show_grace' | 'stuck_call';

const decideNoShowStatus = (callerJoined: boolean, calleeJoined: boolean): CallStatus => {
  if (!callerJoined && !calleeJoined) return CallStatus.NO_SHOW_BOTH;
  if (!callerJoined) return CallStatus.NO_SHOW_CALLER;
  if (!calleeJoined) return CallStatus.NO_SHOW_CALLEE;
  throw new Error('determineTerminalStatus: both joined within grace, not terminal');
};

const decideBothLeftStatus = (callerLeft: Date | null, calleeLeft: Date | null): CallStatus => {
  if (!callerLeft || !calleeLeft) return CallStatus.COMPLETED;
  const cfg = platformConfig.bookings();
  const gapMs = Math.abs(callerLeft.getTime() - calleeLeft.getTime());
  if (gapMs <= cfg.network_flap_window_seconds * 1000) return CallStatus.COMPLETED;
  return callerLeft.getTime() < calleeLeft.getTime()
    ? CallStatus.DISCONNECTED_CALLER
    : CallStatus.DISCONNECTED_CALLEE;
};

const decideStuckCallStatus = (callerLeft: Date | null, calleeLeft: Date | null): CallStatus => {
  if (callerLeft && !calleeLeft) return CallStatus.DISCONNECTED_CALLER;
  if (!callerLeft && calleeLeft) return CallStatus.DISCONNECTED_CALLEE;
  return CallStatus.COMPLETED;
};

// Determines the terminal call_status from the join/leave state + the
// reason why we're resolving (no-show grace expired, both-left, stuck-call cron).
export const determineTerminalStatus = (call: CallRow, reason: ResolveReason): CallStatus => {
  if (reason === 'no_show_grace') {
    return decideNoShowStatus(call.caller_joined_at !== null, call.callee_joined_at !== null);
  }
  if (reason === 'both_left') {
    return decideBothLeftStatus(call.caller_left_at, call.callee_left_at);
  }
  return decideStuckCallStatus(call.caller_left_at, call.callee_left_at);
};

export interface ResolveOutput {
  status: CallStatus;
  connectedSeconds: number;
  settlement: SettlementBreakdown;
  settlementJournalId: string | null;
  refundJournalId: string | null;
}

const decideTerminalStatus = (call: CallRow, reason: ResolveReason): CallStatus => {
  if (reason === 'no_show_grace' && call.caller_joined_at && call.callee_joined_at) {
    return determineTerminalStatus(call, 'both_left');
  }
  return determineTerminalStatus(call, reason);
};

const postSettlementJournal = async (
  runner: QueryRunner,
  callId: string,
  payeeUserId: string,
  feeMode: string,
  status: CallStatus,
  breakdown: SettlementBreakdown,
): Promise<string | null> => {
  if (breakdown.payeeCreditKobo === 0n && breakdown.platformCreditKobo === 0n) return null;
  const [payeeAcct, platformRevenue, pendingPool] = await Promise.all([
    accountFor.user(payeeUserId),
    accountFor.system('platform_revenue'),
    accountFor.system('pending_debits_pool'),
  ]);
  const lines: { accountId: string; signedAmountKobo: number }[] = [];
  if (breakdown.payeeCreditKobo > 0n) {
    lines.push({ accountId: payeeAcct.id, signedAmountKobo: Number(breakdown.payeeCreditKobo) });
  }
  if (breakdown.platformCreditKobo > 0n) {
    lines.push({
      accountId: platformRevenue.id,
      signedAmountKobo: Number(breakdown.platformCreditKobo),
    });
  }
  const releasedFromPool = breakdown.payeeCreditKobo + breakdown.platformCreditKobo;
  lines.push({ accountId: pendingPool.id, signedAmountKobo: -Number(releasedFromPool) });
  const settle = await postJournal(
    {
      kind: 'call_settlement',
      idempotencyKey: `call:${callId}:settle`,
      lines,
      relatedCallId: callId,
      relatedUserId: payeeUserId,
      memo: `Call ${callId} ${status} payee=${breakdown.payeeCreditKobo} platform=${breakdown.platformCreditKobo} (mode=${feeMode})`,
    },
    runner,
  );
  return settle.journalId;
};

const postCallerRefund = async (
  runner: QueryRunner,
  callId: string,
  callerUserId: string,
  status: CallStatus,
  refundKobo: bigint,
): Promise<string | null> => {
  if (refundKobo === 0n) return null;
  const m = await import('@lib/wallet/flows/refund.js');
  const refund = await m.refundReserve(runner, {
    callId,
    payerUserId: callerUserId,
    amountKobo: refundKobo,
    refundRequestId: `call-${callId}-${status}`,
  });
  return refund.journalId;
};

const issueStrikeForResolution = async (
  runner: QueryRunner,
  call: CallRow,
  booking: BookingRow,
  status: CallStatus,
): Promise<void> => {
  if (status === CallStatus.NO_SHOW_CALLEE) {
    await maybeIssueStrike(runner, {
      professionalUserId: booking.callee_user_id,
      relatedCallId: call.id,
      relatedBookingId: booking.id,
      reasonCode: StrikeReason.NO_SHOW,
      description: `Pro did not show for call ${call.id}`,
    });
  } else if (status === CallStatus.DISCONNECTED_CALLEE) {
    await maybeIssueStrike(runner, {
      professionalUserId: booking.callee_user_id,
      relatedCallId: call.id,
      relatedBookingId: booking.id,
      reasonCode: StrikeReason.MID_CALL_QUIT,
      description: `Pro disconnected mid-call ${call.id}`,
    });
  }
};

// Posts the settlement + refund journals atomically and flips the call to its
// terminal status. Caller is responsible for opening + committing the tx.
export const resolveCall = async (
  runner: QueryRunner,
  callId: string,
  reason: ResolveReason,
): Promise<ResolveOutput> => {
  const call = await repo.findByIdForUpdate(runner, callId);
  if (!call) throw new Error(`resolveCall: call ${callId} not found`);
  const booking = await bookingsRepo.findByIdForUpdate(runner, call.booking_id);
  if (!booking) throw new Error(`resolveCall: booking ${call.booking_id} not found`);

  const fallbackEnd = new Date(booking.start_at.getTime() + booking.duration_minutes * 60_000);
  const connectedSeconds = computeConnectedSeconds(
    call.caller_joined_at,
    call.caller_left_at,
    call.callee_joined_at,
    call.callee_left_at,
    fallbackEnd,
  );

  const status = decideTerminalStatus(call, reason);
  const callForCompute: CallRow = { ...call, connected_seconds: connectedSeconds };
  const breakdown = computeSettlement(booking, callForCompute, status);

  const settlementJournalId = await postSettlementJournal(
    runner,
    call.id,
    booking.callee_user_id,
    booking.fee_mode_used,
    status,
    breakdown,
  );
  const refundJournalId = await postCallerRefund(
    runner,
    call.id,
    booking.caller_user_id,
    status,
    breakdown.callerRefundKobo,
  );

  await repo.setTerminalState(
    runner,
    call.id,
    status,
    connectedSeconds,
    settlementJournalId,
    refundJournalId,
  );
  await bookingsRepo.setFulfilled(runner, booking.id);

  await repo.recordEvent(runner, {
    callId: call.id,
    eventType: 'resolved',
    payload: {
      status,
      reason,
      connected_seconds: connectedSeconds,
      payee_credit_kobo: breakdown.payeeCreditKobo.toString(),
      platform_credit_kobo: breakdown.platformCreditKobo.toString(),
      caller_refund_kobo: breakdown.callerRefundKobo.toString(),
    },
  });

  await issueStrikeForResolution(runner, call, booking, status);

  // Outbox: settled / no_show / completed.
  const eventType =
    status === CallStatus.COMPLETED ||
    status === CallStatus.DISCONNECTED_CALLER ||
    status === CallStatus.DISCONNECTED_CALLEE
      ? OutboxEventType.CALL_SETTLED
      : OutboxEventType.CALL_REFUNDED;
  await insertEvent(runner, {
    aggregateType: OutboxAggregateType.CALL,
    aggregateId: call.id,
    eventType,
    payload: {
      call_id: call.id,
      booking_id: booking.id,
      status,
      payer_user_id: booking.caller_user_id,
      payee_user_id: booking.callee_user_id,
      connected_seconds: connectedSeconds,
      net_kobo: breakdown.payeeCreditKobo.toString(),
      amount_kobo: breakdown.callerRefundKobo.toString(),
    },
  });

  logger.info(
    {
      callId: call.id,
      status,
      reason,
      connectedSeconds,
      payeeCreditKobo: breakdown.payeeCreditKobo.toString(),
      callerRefundKobo: breakdown.callerRefundKobo.toString(),
    },
    'call resolved',
  );

  return {
    status,
    connectedSeconds,
    settlement: breakdown,
    settlementJournalId,
    refundJournalId,
  };
};
