import * as authRepo from '@features/auth/auth.repo.js';
import * as bookingsRepo from '@features/bookings/bookings.repo.js';
import { computeBookingPrice } from '@features/bookings/bookings.service.js';
import * as callsRepo from '@features/calls/calls.repo.js';
import { resolveCall } from '@features/calls/calls.resolver.js';
import { CallStatus } from '@features/calls/calls.types.js';
import * as ratesRepo from '@features/rates/rates.repo.js';
import { agoraUidForUserId, issueAgoraRtcToken } from '@lib/agora/index.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { koboToJson } from '@lib/money.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { reservePayment } from '@lib/wallet/flows/pay.js';
import { refundPostSettle, refundReserve } from '@lib/wallet/flows/refund.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

// ── POST /admin/calls/test-init ─────────────────────────────────────────────
//
// Skip the booking flow. Create a booking row + call row directly, mint
// Agora tokens for both sides, return the channel + tokens. Used by the
// test-area-web two-party-call harness to spin up a working call in five
// seconds for QA.
//
// Caller's wallet IS debited (we use the real reservePayment flow) so the
// money side is exercised honestly. To avoid burning real money, run with
// a wallet that's been admin-credited for testing.

export interface AdminTestInitInput {
  callerUserId: string;
  calleeUserId: string;
  rateId?: string; // if omitted, uses the callee's first active rate
  startInSeconds?: number; // default 0 (right now)
  adminId: string;
}

export const adminTestInitCall = async (input: AdminTestInitInput) => {
  const caller = await authRepo.findUserById(input.callerUserId);
  const callee = await authRepo.findUserById(input.calleeUserId);
  if (!caller || !callee || caller.deleted_at !== null || callee.deleted_at !== null) {
    return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_CALL_TEST_INIT, 404, {
      user_id: ['caller or callee not found'],
    });
  }
  // C-NEW-06: same gate as the user-flow booking — refuse if either side
  // isn't active. Admin test-init is a convenience for QA, but it should
  // never make money move against a suspended/blocked user.
  if (caller.status !== 'active') {
    return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_CALL_TEST_INIT, 409, {
      caller_user_id: [`Caller is currently ${caller.status}`],
    });
  }
  if (callee.status !== 'active') {
    return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_CALL_TEST_INIT, 409, {
      callee_user_id: [`Callee is currently ${callee.status}`],
    });
  }

  // Pick a rate.
  let rate;
  if (input.rateId) {
    rate = await ratesRepo.findByIdForUser(input.rateId, input.calleeUserId);
  } else {
    const rates = await ratesRepo.findActiveByUser(input.calleeUserId);
    rate = rates[0] ?? null;
  }
  if (!rate) {
    return new ServiceError('rate_not_found', MESSAGE_KEYS.ADMIN_CALL_TEST_INIT, 404, {
      rate_id: ['callee has no active rates'],
    });
  }

  const cfg = platformConfig.wallet();
  const breakdown = computeBookingPrice(
    BigInt(rate.price_kobo),
    cfg.platform_fee_bps,
    cfg.fee_mode,
  );
  const startAt = new Date(Date.now() + (input.startInSeconds ?? 0) * 1000);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const booking = await bookingsRepo.create(client, {
      callerUserId: input.callerUserId,
      calleeUserId: input.calleeUserId,
      rateId: rate.id,
      callType: rate.call_type,
      startAt,
      durationMinutes: rate.duration_minutes,
      totalPaidKobo: breakdown.totalPaidKobo,
      payeeAmountKobo: breakdown.payeeAmountKobo,
      platformFeeKobo: breakdown.platformFeeKobo,
      feeModeUsed: breakdown.feeModeUsed,
      idempotencyKey: null,
    });
    // Create the call row BEFORE reserving so reservePayment's journal can
    // legally reference call.id via related_call_id (FK from migration
    // 0043). See C-NEW-03.
    const call = await callsRepo.create(client, booking.id);
    await callsRepo.recordEvent(client, {
      callId: call.id,
      eventType: 'admin_test_init',
      payload: { admin_id: input.adminId },
    });
    const reserve = await reservePayment(
      {
        userId: input.callerUserId,
        amountKobo: breakdown.totalPaidKobo,
        purpose: 'call_payment',
        externalRefId: call.id,
      },
      client,
    );
    if (reserve.status === 'insufficient_balance') {
      await client.query('ROLLBACK');
      return new ServiceError('insufficient_balance', MESSAGE_KEYS.ADMIN_CALL_TEST_INIT, 409, {
        caller: [`short by ${reserve.shortByKobo.toString()} kobo`],
      });
    }
    await bookingsRepo.setReservationJournalAndConfirm(client, booking.id, reserve.journalId);
    await client.query('COMMIT');

    // Mint tokens for both sides outside the tx.
    const tokenCfg = platformConfig.bookings();
    const callerToken = issueAgoraRtcToken({
      channelName: call.agora_channel_name,
      uid: agoraUidForUserId(input.callerUserId),
      role: 'publisher',
      expiresInSeconds: tokenCfg.token_expires_seconds,
    });
    const calleeToken = issueAgoraRtcToken({
      channelName: call.agora_channel_name,
      uid: agoraUidForUserId(input.calleeUserId),
      role: 'publisher',
      expiresInSeconds: tokenCfg.token_expires_seconds,
    });

    logger.info(
      {
        callId: call.id,
        bookingId: booking.id,
        callerUserId: input.callerUserId,
        calleeUserId: input.calleeUserId,
      },
      'admin test-init call created',
    );

    return new ServiceSuccess(
      {
        booking_id: booking.id,
        call_id: call.id,
        agora_app_id: callerToken.appId,
        agora_channel_name: call.agora_channel_name,
        call_type: rate.call_type,
        duration_minutes: rate.duration_minutes,
        start_at: startAt.toISOString(),
        total_paid_kobo: koboToJson(breakdown.totalPaidKobo),
        caller: {
          user_id: input.callerUserId,
          agora_uid: callerToken.uid,
          agora_token: callerToken.token,
          expires_at: callerToken.expiresAt.toISOString(),
        },
        callee: {
          user_id: input.calleeUserId,
          agora_uid: calleeToken.uid,
          agora_token: calleeToken.token,
          expires_at: calleeToken.expiresAt.toISOString(),
        },
      },
      MESSAGE_KEYS.ADMIN_CALL_TEST_INIT,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    // 23P01 from the bookings_no_overlap GiST constraint — translate to a
    // friendly 409 instead of letting it bubble as a 500. Same code path as
    // the normal /bookings endpoint.
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23P01') {
      logger.warn({ err }, 'admin test-init hit overlap exclusion');
      return new ServiceError('professional_unavailable', MESSAGE_KEYS.ADMIN_CALL_TEST_INIT, 409, {
        start_in_seconds: [
          'Callee already has an overlapping booking — pick a different start time',
        ],
      });
    }
    logger.error({ err }, 'admin test-init failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── GET /admin/calls ────────────────────────────────────────────────────────

export interface AdminListCallsDto {
  cursor?: string | undefined;
  limit?: number | undefined;
  status?: string | undefined;
  user_id?: string | undefined;
}

export const adminListCalls = async (dto: AdminListCallsDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_CALLS_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const params: unknown[] = [];
  const filters: string[] = [];
  if (dto.status) {
    params.push(dto.status);
    filters.push(`c.status = $${params.length}::call_status`);
  }
  if (dto.user_id) {
    params.push(dto.user_id);
    params.push(dto.user_id);
    filters.push(
      `(b.caller_user_id = $${params.length - 1} OR b.callee_user_id = $${params.length})`,
    );
  }
  if (cursor) {
    params.push(cursor.last_sort_key);
    params.push(cursor.last_id);
    filters.push(
      `(c.created_at < $${params.length - 1}::timestamptz OR (c.created_at = $${params.length - 1}::timestamptz AND c.id < $${params.length}))`,
    );
  }
  params.push(limit + 1);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const res = await pool.query<{
    id: string;
    booking_id: string;
    status: string;
    agora_channel_name: string;
    connected_seconds: number;
    caller_user_id: string;
    callee_user_id: string;
    created_at: Date;
    ended_at: Date | null;
  }>(
    `SELECT c.id, c.booking_id, c.status::text AS status, c.agora_channel_name,
            c.connected_seconds, b.caller_user_id, b.callee_user_id,
            c.created_at, c.ended_at
       FROM calls c
       JOIN bookings b ON b.id = c.booking_id
       ${where}
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT $${params.length}`,
    params,
  );
  const rows = res.rows;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.created_at.toISOString() })
      : null;
  return new ServiceSuccess(
    {
      items: page.map((r) => ({
        id: r.id,
        booking_id: r.booking_id,
        status: r.status,
        agora_channel_name: r.agora_channel_name,
        connected_seconds: r.connected_seconds,
        caller_user_id: r.caller_user_id,
        callee_user_id: r.callee_user_id,
        created_at: r.created_at.toISOString(),
        ended_at: r.ended_at?.toISOString() ?? null,
      })),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    MESSAGE_KEYS.ADMIN_CALLS_LIST_FETCHED,
  );
};

// ── POST /admin/calls/:id/force-end ─────────────────────────────────────────

export const adminForceEndCall = async (callId: string, adminId: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const call = await callsRepo.findByIdForUpdate(client, callId);
    if (!call) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_found', MESSAGE_KEYS.ADMIN_CALL_FORCE_ENDED, 404);
    }
    if (
      call.status !== CallStatus.SCHEDULED &&
      call.status !== CallStatus.WAITING_FOR_PARTIES &&
      call.status !== CallStatus.IN_PROGRESS
    ) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', MESSAGE_KEYS.ADMIN_CALL_FORCE_ENDED, 409);
    }
    const reason = call.status === CallStatus.IN_PROGRESS ? 'stuck_call' : 'no_show_grace';
    const result = await resolveCall(client, call.id, reason);
    await callsRepo.recordEvent(client, {
      callId: call.id,
      eventType: 'admin_force_end',
      payload: { admin_id: adminId, reason, terminal_status: result.status },
    });
    await client.query('COMMIT');
    return new ServiceSuccess(
      {
        call_id: call.id,
        status: result.status,
        connected_seconds: result.connectedSeconds,
        settlement_journal_id: result.settlementJournalId,
        refund_journal_id: result.refundJournalId,
      },
      MESSAGE_KEYS.ADMIN_CALL_FORCE_ENDED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, callId }, 'adminForceEndCall failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── POST /admin/calls/:id/refund (manual refund tool) ─────────────────────
//
// Posts a refund journal against a call, regardless of the call's current
// state. Two paths:
//
//   - Pre-settle (no settlement_journal_id yet): refundReserve releases
//     funds from the pending pool back to the caller. Same primitive the
//     resolver uses for cancellations.
//   - Post-settle (settlement_journal_id present): refundPostSettle does
//     a clawback — pulls back from the payee + platform_revenue, returns
//     to the caller.
//
// Idempotency anchor is `request_id` from the body, combined with the
// call id by the lib. Retries with the same id collapse to the original
// journal (`alreadyPosted=true`).
//
// Validation: amount cannot exceed what was actually paid (booking.total_paid_kobo).
//
// Audit: a `call_events` row tagged `admin_refund` records who/what/why.
export interface AdminRefundCallInput {
  callId: string;
  amountKobo: bigint;
  reason: string;
  requestId: string;
  adminId: string;
}

export const adminRefundCall = async (input: AdminRefundCallInput) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const call = await callsRepo.findByIdForUpdate(client, input.callId);
    if (!call) {
      await client.query('ROLLBACK');
      return new ServiceError('call_not_found', MESSAGE_KEYS.ADMIN_CALL_REFUNDED, 404);
    }
    const booking = await bookingsRepo.findByIdForUpdate(client, call.booking_id);
    if (!booking) {
      await client.query('ROLLBACK');
      return new ServiceError('not_found', MESSAGE_KEYS.ADMIN_CALL_REFUNDED, 404);
    }

    const totalPaid = BigInt(booking.total_paid_kobo);
    if (input.amountKobo > totalPaid) {
      await client.query('ROLLBACK');
      return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_CALL_REFUNDED, 422, {
        amount_kobo: [`Cannot refund more than total_paid_kobo (${totalPaid.toString()})`],
      });
    }

    const isPostSettle = call.settlement_journal_id !== null;
    let journalId: string;
    let phase: 'pre_settle' | 'post_settle';

    if (isPostSettle) {
      // Post-settle clawback uses the booking's snapshotted fee_bps so the
      // platform's share is reversed correctly. For Mode A
      // (deduct_from_payee) the snapshot is wallet.platform_fee_bps; for
      // Mode B (add_to_payer) the platform fee was added on top, so we
      // back it out using the same snapshot.
      const cfg = platformConfig.wallet();
      const result = await refundPostSettle(client, {
        callId: call.id,
        payerUserId: booking.caller_user_id,
        payeeUserId: booking.callee_user_id,
        amountKobo: input.amountKobo,
        feeBps: cfg.platform_fee_bps,
        refundRequestId: input.requestId,
      });
      journalId = result.journalId;
      phase = 'post_settle';
    } else {
      const result = await refundReserve(client, {
        callId: call.id,
        payerUserId: booking.caller_user_id,
        amountKobo: input.amountKobo,
        refundRequestId: input.requestId,
      });
      journalId = result.journalId;
      phase = 'pre_settle';
    }

    await callsRepo.recordEvent(client, {
      callId: call.id,
      eventType: 'admin_refund',
      payload: {
        admin_id: input.adminId,
        amount_kobo: input.amountKobo.toString(),
        reason: input.reason,
        request_id: input.requestId,
        phase,
        journal_id: journalId,
      },
    });
    await client.query('COMMIT');
    logger.warn(
      {
        callId: call.id,
        adminId: input.adminId,
        amountKobo: input.amountKobo.toString(),
        phase,
        journalId,
      },
      'admin manual refund posted',
    );
    return new ServiceSuccess(
      {
        call_id: call.id,
        journal_id: journalId,
        phase,
        amount_kobo: koboToJson(input.amountKobo),
      },
      MESSAGE_KEYS.ADMIN_CALL_REFUNDED,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, callId: input.callId }, 'adminRefundCall tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── GET /admin/calls/:id (deep detail) ──────────────────────────────────────
//
// Returns the call row + booking + events + any journal entries that
// reference the call. Used by the admin web UI when a support agent is
// triaging a specific call. Read-only.
export const adminGetCallDetail = async (callId: string) => {
  const call = await pool.query<{
    id: string;
    booking_id: string;
    status: string;
    agora_channel_name: string;
    connected_seconds: number;
    caller_joined_at: Date | null;
    callee_joined_at: Date | null;
    caller_left_at: Date | null;
    callee_left_at: Date | null;
    ended_at: Date | null;
    settlement_journal_id: string | null;
    refund_journal_id: string | null;
    created_at: Date;
  }>(
    `SELECT c.id, c.booking_id, c.status::text AS status, c.agora_channel_name,
            c.connected_seconds, c.caller_joined_at, c.callee_joined_at,
            c.caller_left_at, c.callee_left_at, c.ended_at,
            c.settlement_journal_id, c.refund_journal_id, c.created_at
       FROM calls c
       WHERE c.id = $1`,
    [callId],
  );
  if (call.rowCount === 0) {
    return new ServiceError('call_not_found', MESSAGE_KEYS.ADMIN_CALL_DETAIL_FETCHED, 404);
  }
  const callRow = call.rows[0]!;

  const booking = await pool.query<{
    id: string;
    status: string;
    caller_user_id: string;
    callee_user_id: string;
    rate_id: string;
    call_type: string;
    start_at: Date;
    duration_minutes: number;
    total_paid_kobo: string;
    payee_amount_kobo: string;
    platform_fee_kobo: string;
    fee_mode_used: string;
    reservation_journal_id: string | null;
    created_at: Date;
  }>(
    `SELECT id, status::text AS status, caller_user_id, callee_user_id, rate_id,
            call_type::text AS call_type, start_at, duration_minutes,
            total_paid_kobo::text, payee_amount_kobo::text, platform_fee_kobo::text,
            fee_mode_used::text, reservation_journal_id, created_at
       FROM bookings WHERE id = $1`,
    [callRow.booking_id],
  );

  const events = await pool.query<{
    id: string;
    event_type: string;
    payload: unknown;
    occurred_at: Date;
  }>(
    `SELECT id, event_type, payload, occurred_at
       FROM call_events
       WHERE call_id = $1
       ORDER BY occurred_at ASC, id ASC`,
    [callId],
  );

  const journals = await pool.query<{
    id: string;
    kind: string;
    related_call_id: string | null;
    created_at: Date;
  }>(
    `SELECT id, kind::text AS kind, related_call_id, created_at
       FROM journal_entries
       WHERE related_call_id = $1
       ORDER BY created_at ASC, id ASC`,
    [callId],
  );

  const bookingRow = booking.rows[0];

  return new ServiceSuccess(
    {
      call: {
        id: callRow.id,
        booking_id: callRow.booking_id,
        status: callRow.status,
        agora_channel_name: callRow.agora_channel_name,
        connected_seconds: callRow.connected_seconds,
        caller_joined_at: callRow.caller_joined_at?.toISOString() ?? null,
        callee_joined_at: callRow.callee_joined_at?.toISOString() ?? null,
        caller_left_at: callRow.caller_left_at?.toISOString() ?? null,
        callee_left_at: callRow.callee_left_at?.toISOString() ?? null,
        ended_at: callRow.ended_at?.toISOString() ?? null,
        settlement_journal_id: callRow.settlement_journal_id,
        refund_journal_id: callRow.refund_journal_id,
        created_at: callRow.created_at.toISOString(),
      },
      booking: bookingRow
        ? {
            id: bookingRow.id,
            status: bookingRow.status,
            caller_user_id: bookingRow.caller_user_id,
            callee_user_id: bookingRow.callee_user_id,
            rate_id: bookingRow.rate_id,
            call_type: bookingRow.call_type,
            start_at: bookingRow.start_at.toISOString(),
            duration_minutes: bookingRow.duration_minutes,
            total_paid_kobo: koboToJson(BigInt(bookingRow.total_paid_kobo)),
            payee_amount_kobo: koboToJson(BigInt(bookingRow.payee_amount_kobo)),
            platform_fee_kobo: koboToJson(BigInt(bookingRow.platform_fee_kobo)),
            fee_mode_used: bookingRow.fee_mode_used,
            reservation_journal_id: bookingRow.reservation_journal_id,
            created_at: bookingRow.created_at.toISOString(),
          }
        : null,
      events: events.rows.map((e) => ({
        id: e.id,
        event_type: e.event_type,
        payload: e.payload,
        occurred_at: e.occurred_at.toISOString(),
      })),
      journals: journals.rows.map((j) => ({
        id: j.id,
        kind: j.kind,
        related_call_id: j.related_call_id,
        created_at: j.created_at.toISOString(),
      })),
    },
    MESSAGE_KEYS.ADMIN_CALL_DETAIL_FETCHED,
  );
};

// ── GET /admin/bookings ─────────────────────────────────────────────────────

export interface AdminListBookingsDto {
  cursor?: string | undefined;
  limit?: number | undefined;
  status?: string | undefined;
  user_id?: string | undefined;
}

export const adminListBookings = async (dto: AdminListBookingsDto) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', MESSAGE_KEYS.ADMIN_BOOKINGS_LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const params: unknown[] = [];
  const filters: string[] = [];
  if (dto.status) {
    params.push(dto.status);
    filters.push(`status = $${params.length}::booking_status`);
  }
  if (dto.user_id) {
    params.push(dto.user_id);
    params.push(dto.user_id);
    filters.push(`(caller_user_id = $${params.length - 1} OR callee_user_id = $${params.length})`);
  }
  if (cursor) {
    params.push(cursor.last_sort_key);
    params.push(cursor.last_id);
    filters.push(
      `(start_at < $${params.length - 1}::timestamptz OR (start_at = $${params.length - 1}::timestamptz AND id < $${params.length}))`,
    );
  }
  params.push(limit + 1);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const res = await pool.query<{
    id: string;
    status: string;
    caller_user_id: string;
    callee_user_id: string;
    rate_id: string;
    call_type: string;
    start_at: Date;
    duration_minutes: number;
    total_paid_kobo: string;
    fee_mode_used: string;
    created_at: Date;
  }>(
    `SELECT id, status::text AS status, caller_user_id, callee_user_id,
            rate_id, call_type::text AS call_type, start_at, duration_minutes,
            total_paid_kobo::text AS total_paid_kobo,
            fee_mode_used::text AS fee_mode_used, created_at
       FROM bookings
       ${where}
       ORDER BY start_at DESC, id DESC
       LIMIT $${params.length}`,
    params,
  );
  const rows = res.rows;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.start_at.toISOString() })
      : null;
  return new ServiceSuccess(
    {
      items: page.map((r) => ({
        id: r.id,
        status: r.status,
        caller_user_id: r.caller_user_id,
        callee_user_id: r.callee_user_id,
        rate_id: r.rate_id,
        call_type: r.call_type,
        start_at: r.start_at.toISOString(),
        duration_minutes: r.duration_minutes,
        total_paid_kobo: koboToJson(BigInt(r.total_paid_kobo)),
        fee_mode_used: r.fee_mode_used,
        created_at: r.created_at.toISOString(),
      })),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    MESSAGE_KEYS.ADMIN_BOOKINGS_LIST_FETCHED,
  );
};
