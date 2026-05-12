import * as authRepo from '@features/auth/auth.repo.js';
import * as callsRepo from '@features/calls/calls.repo.js';
import * as bookingBlocksRepo from '@features/profile/booking-blocks.repo.js';
import { bookingHitsBlock } from '@features/professionals/availability.js';
import * as ratesRepo from '@features/rates/rates.repo.js';
import { maybeIssueStrike } from '@features/strikes/strikes.service.js';
import { StrikeReason, SubjectRole } from '@features/strikes/strikes.types.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { koboToJson } from '@lib/money.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';
import { decodeCursor, encodeCursor, resolveLimit } from '@lib/pagination.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { computePlatformFee } from '@lib/wallet/accounting.js';
import { accountFor } from '@lib/wallet/accounts.js';
import { reservePayment } from '@lib/wallet/flows/pay.js';
import { refundReserve } from '@lib/wallet/flows/refund.js';
import { postJournal } from '@lib/wallet/journal.js';

import { BOOKING_MESSAGES } from './bookings.messages.js';
import * as repo from './bookings.repo.js';
import type {
  CancelBookingDto,
  CreateBookingDto,
  ListBookingsQueryDto,
} from './bookings.schema.js';
import { BookingStatus, FeeMode, type BookingRow, type BookingView } from './bookings.types.js';

const toView = (row: BookingRow, callId: string | null): BookingView => ({
  id: row.id,
  status: row.status,
  caller_user_id: row.caller_user_id,
  callee_user_id: row.callee_user_id,
  rate_id: row.rate_id,
  call_type: row.call_type,
  start_at: row.start_at.toISOString(),
  duration_minutes: row.duration_minutes,
  total_paid_kobo: koboToJson(BigInt(row.total_paid_kobo)),
  payee_amount_kobo: koboToJson(BigInt(row.payee_amount_kobo)),
  platform_fee_kobo: koboToJson(BigInt(row.platform_fee_kobo)),
  fee_mode_used: row.fee_mode_used,
  call_id: callId,
  cancelled_at: row.cancelled_at ? row.cancelled_at.toISOString() : null,
  cancelled_by_user_id: row.cancelled_by_user_id,
  created_at: row.created_at.toISOString(),
});

// Compute the three amount fields based on the rate price + the active fee
// mode. See docs/calls-architecture.html §3 for the math.
//
//   deduct_from_payee: total_paid = rate_price; payee = price - fee; platform = fee
//   add_to_payer:      total_paid = rate_price + fee; payee = price; platform = fee
export interface BookingPriceBreakdown {
  totalPaidKobo: bigint;
  payeeAmountKobo: bigint;
  platformFeeKobo: bigint;
  feeModeUsed: FeeMode;
}

export const computeBookingPrice = (
  rateKobo: bigint,
  feeBps: number,
  feeMode: FeeMode,
): BookingPriceBreakdown => {
  const fee = BigInt(computePlatformFee(Number(rateKobo), feeBps));
  if (feeMode === FeeMode.ADD_TO_PAYER) {
    return {
      totalPaidKobo: rateKobo + fee,
      payeeAmountKobo: rateKobo,
      platformFeeKobo: fee,
      feeModeUsed: FeeMode.ADD_TO_PAYER,
    };
  }
  return {
    totalPaidKobo: rateKobo,
    payeeAmountKobo: rateKobo - fee,
    platformFeeKobo: fee,
    feeModeUsed: FeeMode.DEDUCT_FROM_PAYEE,
  };
};

interface CreateContext {
  dto: CreateBookingDto;
  userId: string;
  idempotencyKey: string | null;
}

// Two race-condition error codes both end up at the booking-create catch
// block when N callers hit the same callee+slot at once. Both translate
// to the same `professional_unavailable` 409 — the booking didn't happen,
// money rolled back, the user can retry.
//
//   23P01 = exclusion_violation. The bookings_no_overlap GiST constraint
//           tripped — a concurrent request slipped past the FOR UPDATE
//           check.
//   40P01 = deadlock_detected. Two racers grabbed conflicting row locks
//           in opposite order. Postgres aborts one to break the cycle.
//           (C-NEW-08)
const isBookingRaceError = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: string }).code;
  return code === '23P01' || code === '40P01';
};

/**
 * Reads the pro's recurring booking blocks and returns a 409 ServiceError
 * if the requested booking interval overlaps any of them. Read-only —
 * blocks are stable for the duration of a single create call, so no lock
 * is needed. Returns `null` when the slot is clear.
 */
const checkBookingBlocksGuard = async (
  proId: string,
  startAt: Date,
  durationMinutes: number,
): Promise<ServiceError | null> => {
  const blockRows = await bookingBlocksRepo.listForUser(proId);
  if (blockRows.length === 0) return null;
  const blocks = blockRows.map((b) => ({
    startMinute: b.start_minute,
    endMinute: b.end_minute,
  }));
  const cfg = platformConfig.availability();
  if (!bookingHitsBlock(startAt, durationMinutes, blocks, cfg.default_timezone)) {
    return null;
  }
  return new ServiceError('professional_unavailable', BOOKING_MESSAGES.CONFLICT, 409, {
    start_at: ['Slot overlaps a time the professional has blocked'],
  });
};

// ── POST /bookings ──────────────────────────────────────────────────────────

export const createBooking = async (ctx: CreateContext) => {
  // Idempotency replay short-circuit.
  if (ctx.idempotencyKey) {
    const replay = await repo.findByIdempotencyKey(ctx.userId, ctx.idempotencyKey);
    if (replay) {
      return new ServiceSuccess(toView(replay, null), BOOKING_MESSAGES.CREATED);
    }
  }

  // Caller must exist + must not be the callee.
  if (ctx.dto.callee_user_id === ctx.userId) {
    return new ServiceError('validation_error', BOOKING_MESSAGES.INVALID, 422, {
      callee_user_id: ['Cannot book yourself'],
    });
  }
  const callee = await authRepo.findUserById(ctx.dto.callee_user_id);
  if (!callee || callee.deleted_at !== null) {
    return new ServiceError('not_found', BOOKING_MESSAGES.INVALID, 404, {
      callee_user_id: ['Professional not found'],
    });
  }
  // C-NEW-06: a suspended/blocked pro can't take bookings. Without this
  // gate, an auto-banned pro stays bookable, callers reserve money against
  // them, the call no-shows, and the engine churns refunds. The pro can
  // dispute their suspension via /me/strikes/:id/dispute (those routes
  // skip requireActiveUser by design).
  if (callee.status !== 'active') {
    return new ServiceError('professional_unavailable', BOOKING_MESSAGES.CONFLICT, 409, {
      callee_user_id: [`Professional is currently ${callee.status} and not accepting bookings`],
    });
  }
  // KYC gate: discovery already filters on kyc_status='approved' (see
  // PROFESSIONAL_VISIBLE_PREDICATE in professionals.repo.ts), but the home
  // + list responses are cached up to 300s. Without this check, anyone
  // who saw a now-rejected pro in their cached /home (or has the user_id
  // from a deeplink / share-slug / older session) could still book them
  // and move money against an unverified professional. Same error code
  // as the status check above so the client UX is unchanged.
  if (callee.kyc_status !== 'approved') {
    return new ServiceError('professional_unavailable', BOOKING_MESSAGES.CONFLICT, 409, {
      callee_user_id: ['Professional is not currently accepting bookings'],
    });
  }

  // Rate must belong to the callee + be active.
  const rate = await ratesRepo.findByIdForUser(ctx.dto.rate_id, ctx.dto.callee_user_id);
  if (!rate || rate.deleted_at !== null) {
    return new ServiceError('rate_not_found', BOOKING_MESSAGES.INVALID, 404, {
      rate_id: ['Rate not found or not owned by professional'],
    });
  }

  const startAt = new Date(ctx.dto.start_at);
  if (startAt.getTime() <= Date.now()) {
    return new ServiceError('validation_error', BOOKING_MESSAGES.INVALID, 422, {
      start_at: ['start_at must be in the future'],
    });
  }

  // Same 409 as a double-book overlap so the client UX is identical
  // ("this slot isn't bookable").
  const blockedErr = await checkBookingBlocksGuard(
    ctx.dto.callee_user_id,
    startAt,
    rate.duration_minutes,
  );
  if (blockedErr !== null) return blockedErr;

  const cfg = platformConfig.wallet();
  const breakdown = computeBookingPrice(
    BigInt(rate.price_kobo),
    cfg.platform_fee_bps,
    cfg.fee_mode,
  );

  // Tx: overlap check (FOR UPDATE) → insert booking → reserve wallet → flip
  // to confirmed → create call row. Doing the overlap check INSIDE the tx
  // serializes concurrent requests for the same callee/window. The DB-level
  // GiST exclusion constraint (migration 0048) is the airtight backstop —
  // even if two readers somehow saw the slot as free, the second commit
  // fails with 23P01 exclusion_violation, which we catch and translate.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const overlap = await repo.findOverlappingConfirmedForCallee(
      client,
      ctx.dto.callee_user_id,
      startAt,
      rate.duration_minutes,
    );
    if (overlap) {
      await client.query('ROLLBACK');
      return new ServiceError('professional_unavailable', BOOKING_MESSAGES.CONFLICT, 409);
    }

    const booking = await repo.create(client, {
      callerUserId: ctx.userId,
      calleeUserId: ctx.dto.callee_user_id,
      rateId: rate.id,
      callType: rate.call_type,
      startAt,
      durationMinutes: rate.duration_minutes,
      totalPaidKobo: breakdown.totalPaidKobo,
      payeeAmountKobo: breakdown.payeeAmountKobo,
      platformFeeKobo: breakdown.platformFeeKobo,
      feeModeUsed: breakdown.feeModeUsed,
      idempotencyKey: ctx.idempotencyKey,
    });

    // Create the call row BEFORE reserving wallet money. The reservation
    // journal stamps `related_call_id` from the externalRefId we pass to
    // reservePayment, and migration 0043 added a deferred FK from
    // journal_entries.related_call_id → calls(id). If we reserved against
    // booking.id the FK would reject at COMMIT with "Key (related_call_id)
    // = (bk_*) is not present in calls". Order: booking → call → reserve.
    const call = await callsRepo.create(client, booking.id);
    await callsRepo.recordEvent(client, {
      callId: call.id,
      eventType: 'created',
      payload: {
        booking_id: booking.id,
        start_at: startAt.toISOString(),
        duration_minutes: rate.duration_minutes,
      },
    });

    // Reserve the full amount the user is paying (which differs by fee_mode).
    // externalRefId = call.id so the reservation journal's related_call_id
    // points at a real call row.
    const reserveResult = await reservePayment(
      {
        userId: ctx.userId,
        amountKobo: breakdown.totalPaidKobo,
        purpose: 'call_payment',
        externalRefId: call.id,
      },
      client,
    );

    if (reserveResult.status === 'insufficient_balance') {
      await client.query('ROLLBACK');
      return new ServiceError('insufficient_balance', BOOKING_MESSAGES.INVALID, 409, {
        total_paid_kobo: [
          `Insufficient balance: short by ${reserveResult.shortByKobo.toString()} kobo`,
        ],
      });
    }

    await repo.setReservationJournalAndConfirm(client, booking.id, reserveResult.journalId);

    await insertEvent(client, {
      aggregateType: OutboxAggregateType.CALL,
      aggregateId: call.id,
      eventType: OutboxEventType.CALL_PAYMENT_RESERVED,
      payload: {
        booking_id: booking.id,
        call_id: call.id,
        caller_user_id: ctx.userId,
        callee_user_id: ctx.dto.callee_user_id,
        total_paid_kobo: breakdown.totalPaidKobo.toString(),
        platform_fee_kobo: breakdown.platformFeeKobo.toString(),
        fee_mode_used: breakdown.feeModeUsed,
        start_at: startAt.toISOString(),
      },
    });
    await client.query('COMMIT');

    const fresh = await repo.findById(booking.id);
    logger.info(
      {
        bookingId: booking.id,
        callId: call.id,
        callerUserId: ctx.userId,
        calleeUserId: ctx.dto.callee_user_id,
        totalPaidKobo: breakdown.totalPaidKobo.toString(),
      },
      'booking created + confirmed + call scheduled',
    );
    return new ServiceSuccess(toView(fresh!, call.id), BOOKING_MESSAGES.CREATED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (isBookingRaceError(err)) {
      logger.warn(
        { err, callerUserId: ctx.userId },
        'booking race translated to professional_unavailable',
      );
      return new ServiceError('professional_unavailable', BOOKING_MESSAGES.CONFLICT, 409);
    }
    logger.error({ err, callerUserId: ctx.userId }, 'createBooking tx failed');
    throw err;
  } finally {
    client.release();
  }
};

// ── GET /bookings ───────────────────────────────────────────────────────────

export const listBookings = async (dto: ListBookingsQueryDto, userId: string) => {
  const limit = resolveLimit(dto.limit);
  let cursor: { last_id: string; last_sort_key: string } | undefined;
  if (dto.cursor !== undefined) {
    try {
      cursor = decodeCursor(dto.cursor);
    } catch {
      return new ServiceError('validation_error', BOOKING_MESSAGES.LIST_FETCHED, 400, {
        cursor: ['Invalid cursor'],
      });
    }
  }
  const rows = await repo.listForUser({
    userId,
    role: dto.role ?? 'either',
    limit,
    ...(cursor ? { cursor } : {}),
    ...(dto.status ? { status: dto.status } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ last_id: last.id, last_sort_key: last.start_at.toISOString() })
      : null;

  return new ServiceSuccess(
    {
      items: page.map((r) => toView(r, null)),
      meta: { next_cursor: nextCursor, has_more: hasMore },
    },
    BOOKING_MESSAGES.LIST_FETCHED,
  );
};

// ── GET /bookings/:id ───────────────────────────────────────────────────────

export const getBooking = async (bookingId: string, userId: string) => {
  const row = await repo.findById(bookingId);
  if (!row || (row.caller_user_id !== userId && row.callee_user_id !== userId)) {
    return new ServiceError('booking_not_found', BOOKING_MESSAGES.NOT_FOUND, 404);
  }
  const call = await callsRepo.findByBookingId(row.id);
  return new ServiceSuccess(toView(row, call?.id ?? null), BOOKING_MESSAGES.FETCHED);
};

// ── POST /bookings/:id/cancel ───────────────────────────────────────────────
//
// Cancellation refund logic per architecture doc §6:
//
//   outside cancel_window_minutes → full refund (caller AND callee paths).
//   inside window:
//     caller cancels  → refund = total × (1 - penalty_bps); penalty kept by platform_revenue.
//     callee cancels  → full refund (no service rendered, pro takes the strike).
//
// All refunds use refundReserve (pre-settle) since the call hasn't been
// settled yet. The "penalty kept by platform" path does refund_reserve for
// the refund slice + manual_journal for the penalty → platform_revenue.

export const cancelBooking = async (bookingId: string, _dto: CancelBookingDto, userId: string) => {
  const cfg = platformConfig.bookings();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const booking = await repo.findByIdForUpdate(client, bookingId);
    if (!booking || (booking.caller_user_id !== userId && booking.callee_user_id !== userId)) {
      await client.query('ROLLBACK');
      return new ServiceError('booking_not_found', BOOKING_MESSAGES.NOT_FOUND, 404);
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', BOOKING_MESSAGES.CONFLICT, 409, undefined);
    }

    // Look up the call so refund + penalty journals can reference call.id
    // (FK from migration 0043 rejects bk_*). Confirmed bookings always have
    // a matching call row created at booking time — but be defensive.
    const call = await callsRepo.findByBookingId(booking.id);
    if (!call) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', BOOKING_MESSAGES.CONFLICT, 409, {
        booking_id: ['Booking has no associated call row — internal inconsistency'],
      });
    }

    const now = Date.now();
    const startMs = booking.start_at.getTime();
    if (startMs <= now) {
      await client.query('ROLLBACK');
      return new ServiceError('conflict', BOOKING_MESSAGES.CONFLICT, 409, {
        start_at: ['Cannot cancel after start_at — wait for no-show resolution'],
      });
    }
    const minutesUntilStart = (startMs - now) / 60_000;
    const isOutsideWindow = minutesUntilStart >= cfg.cancel_window_minutes;
    const cancelledByCaller = userId === booking.caller_user_id;

    const total = BigInt(booking.total_paid_kobo);
    let refundKobo: bigint;
    let penaltyKobo = 0n;
    let newStatus: 'cancelled_outside_window' | 'cancelled_inside_window';

    if (isOutsideWindow) {
      refundKobo = total;
      newStatus = 'cancelled_outside_window';
    } else if (!cancelledByCaller) {
      // Callee (pro) cancelled inside window — full refund. Strike issuance
      // happens via the strikes feature, hooked from the call resolver path.
      refundKobo = total;
      newStatus = 'cancelled_inside_window';
    } else {
      // Caller cancelled inside window — keep penalty, refund the rest.
      const penaltyBps = BigInt(cfg.inside_window_penalty_bps);
      penaltyKobo = (total * penaltyBps) / 10000n;
      refundKobo = total - penaltyKobo;
      newStatus = 'cancelled_inside_window';
    }

    if (refundKobo > 0n) {
      await refundReserve(client, {
        callId: call.id,
        payerUserId: booking.caller_user_id,
        amountKobo: refundKobo,
        refundRequestId: `cancel-${booking.id}`,
      });
    }

    // The caller-cancel penalty has to leave pending_debits_pool too,
    // otherwise it sits orphaned in the pool with no live booking and the
    // reconciliation worker drifts. Move it to platform_revenue.
    //
    // Journal:
    //   platform_revenue:    +penaltyKobo
    //   pending_debits_pool: -penaltyKobo
    //
    // Idempotent on `cancel:<booking_id>:penalty`. relatedCallId references
    // the actual call row (FK from migration 0043).
    if (penaltyKobo > 0n) {
      const [platformRevenue, pendingPool] = await Promise.all([
        accountFor.system('platform_revenue'),
        accountFor.system('pending_debits_pool'),
      ]);
      await postJournal(
        {
          kind: 'call_settlement',
          idempotencyKey: `cancel:${booking.id}:penalty`,
          lines: [
            { accountId: platformRevenue.id, signedAmountKobo: Number(penaltyKobo) },
            { accountId: pendingPool.id, signedAmountKobo: -Number(penaltyKobo) },
          ],
          relatedCallId: call.id,
          relatedUserId: booking.caller_user_id,
          memo: `Cancellation penalty (caller cancel inside window) booking=${booking.id}`,
        },
        client,
      );
    }

    await repo.setCancelled(client, booking.id, newStatus, userId);

    // Late-cancel strike for the pro if they cancelled inside the window.
    // strikes service gates on the trigger toggle.
    if (newStatus === 'cancelled_inside_window' && !cancelledByCaller) {
      await maybeIssueStrike(client, {
        subjectUserId: booking.callee_user_id,
        subjectRole: SubjectRole.PROFESSIONAL,
        relatedCallId: null,
        relatedBookingId: booking.id,
        reasonCode: StrikeReason.LATE_CANCEL,
        description: `Pro cancelled booking ${booking.id} inside cancellation window`,
      });
    }

    await insertEvent(client, {
      aggregateType: OutboxAggregateType.CALL,
      aggregateId: call.id,
      eventType: OutboxEventType.CALL_REFUNDED,
      payload: {
        booking_id: booking.id,
        call_id: call.id,
        cancelled_by_user_id: userId,
        cancelled_by_role: cancelledByCaller ? 'caller' : 'callee',
        outside_window: isOutsideWindow,
        refund_kobo: refundKobo.toString(),
        penalty_kobo: penaltyKobo.toString(),
        new_status: newStatus,
      },
    });

    await client.query('COMMIT');

    const fresh = await repo.findById(booking.id);
    logger.info(
      {
        bookingId: booking.id,
        cancelledByUserId: userId,
        outsideWindow: isOutsideWindow,
        refundKobo: refundKobo.toString(),
      },
      'booking cancelled',
    );
    return new ServiceSuccess(toView(fresh!, null), BOOKING_MESSAGES.CANCELLED);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, bookingId }, 'cancelBooking tx failed');
    throw err;
  } finally {
    client.release();
  }
};
