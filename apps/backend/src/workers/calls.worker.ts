import type { PoolClient } from 'pg';

import * as authRepo from '@features/auth/auth.repo.js';
import * as bookingsRepo from '@features/bookings/bookings.repo.js';
import * as callsRepo from '@features/calls/calls.repo.js';
import { resolveCall } from '@features/calls/calls.resolver.js';
import { CallStatus } from '@features/calls/calls.types.js';
import { expireStaleInvites } from '@features/instant-calls/call-invites.service.js';
import * as instantCallsRepo from '@features/instant-calls/instant-calls.repo.js';
import { settleActiveCall } from '@features/instant-calls/instant-calls.settlement.js';
import { recordCallEvent } from '@features/chat/chat.service.js';
import { CallEventOutcome } from '@features/chat/chat.types.js';
import { expireStaleIntents } from '@features/intents/index.js';
import {
  INSTANT_CALL_RING_SECONDS,
  InstantCallStatus,
} from '@features/instant-calls/instant-calls.types.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { discardCacheInvalidations, flushCacheInvalidations } from '@lib/db/tx.js';
import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';

// Four call cron jobs run on independent intervals:
//
// 1. CALL STARTER — every 30s, find calls that hit start_at and flip them
//    from `scheduled` to `waiting_for_parties`. Fires `call.starting_soon`
//    to the outbox so mobile push can notify the parties.
//
// 2. NO-SHOW RESOLVER — every 30s, find waiting calls where start_at + grace
//    has elapsed and one or both sides haven't joined. Resolve them as
//    no_show_X (refund + strike).
//
// 3. STUCK-CALL RESOLVER — every minute, find in_progress calls that are
//    past their scheduled end + buffer. Resolve as completed (or
//    disconnected_X if one side never left).
//
// 4. RING-TIMEOUT RESOLVER — every 10s, find instant calls still `ringing`
//    past the ring window. Resolve as missed (no charge), dismiss the ring
//    on every device (push.call_cancelled) and leave the callee a visible
//    "missed call" push. Guarantees no ring dangles forever even when
//    every push was lost and neither client ever called /end.
//
// 5. STALE-ACTIVE RESOLVER — every minute, find instant calls stuck `active`
//    past their allotment + grace. Settle for the time the event log shows
//    was talked. Without this the callee stays pinned behind the
//    one-live-call-per-callee index and can never be called again.
//
// 6. INTENT EXPIRY — every 5 min, retire purchase intents past their window.
//    Bookkeeping only: verify already refuses a lapsed intent.
//
// Each worker uses SELECT ... FOR UPDATE SKIP LOCKED so multiple instances
// can run in parallel without claiming the same row twice.

const STARTER_INTERVAL_MS = 30_000;
const NO_SHOW_INTERVAL_MS = 30_000;
const STUCK_CALL_INTERVAL_MS = 60_000;
const RING_RESOLVER_INTERVAL_MS = 10_000;
const STALE_ACTIVE_INTERVAL_MS = 60_000;
const INTENT_EXPIRY_INTERVAL_MS = 300_000;
// Resolve in_progress calls that are past their scheduled end + 5 min buffer.
// The 5-min buffer absorbs Agora webhook delivery jitter.
const STUCK_BUFFER_SECONDS = 300;
const BATCH_SIZE = 25;

interface WorkerHandle {
  stop: () => Promise<void>;
}

// Run a unit of work for one row inside a SAVEPOINT so a single failure
// doesn't abort the whole batch. Without the savepoint, Postgres puts the
// outer tx in `aborted` state on the first throw and silently rolls back
// every successful peer. See QA finding N-CALLS-02.
const runWithSavepoint = async (
  client: PoolClient,
  rowId: string,
  worker: string,
  fn: () => Promise<void>,
): Promise<void> => {
  const savepoint = `row_${rowId.replace(/[^a-z0-9_]/gi, '_')}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await fn();
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`).catch(() => {});
    logger.warn({ err, rowId, worker }, 'cron row failed; continuing batch');
  }
};

const tickStarter = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await callsRepo.findCallsToStart(client, 0, BATCH_SIZE);
    for (const row of rows) {
      await runWithSavepoint(client, row.id, 'call-starter', async () => {
        await callsRepo.setStatus(client, row.id, CallStatus.WAITING_FOR_PARTIES);
        await callsRepo.recordEvent(client, {
          callId: row.id,
          eventType: 'call_started_window',
          payload: { source: 'cron' },
        });
        await insertEvent(client, {
          aggregateType: OutboxAggregateType.CALL,
          aggregateId: row.id,
          eventType: OutboxEventType.CALL_PAYMENT_RESERVED, // reuse: "call is now joinable"
          payload: {
            call_id: row.id,
            phase: 'starting_soon',
            start_at: row.start_at.toISOString(),
          },
        });

        // Push fan-out: notify both parties the call is joinable. Same
        // tx so the push events only commit if the status flip does —
        // a rollback won't leave spurious "your call is ready" pushes.
        const booking = await bookingsRepo.findByIdForUpdate(client, row.booking_id);
        if (booking) {
          const [caller, callee] = await Promise.all([
            authRepo.findUserById(booking.caller_user_id),
            authRepo.findUserById(booking.callee_user_id),
          ]);
          const politeDeclineUntil = new Date(
            row.start_at.getTime() + platformConfig.bookings().polite_decline_window_seconds * 1000,
          ).toISOString();
          // Notify the callee — they're the one we need to actually pull
          // into the channel.
          await insertEvent(client, {
            aggregateType: OutboxAggregateType.CALL,
            aggregateId: row.id,
            eventType: OutboxEventType.PUSH_CALL_JOINABLE,
            payload: {
              call_id: row.id,
              target_user_id: booking.callee_user_id,
              peer_user_id: booking.caller_user_id,
              peer_full_name: caller?.full_name ?? null,
              peer_avatar_url: caller?.avatar_url ?? null,
              kind: booking.call_type,
              polite_decline_until: politeDeclineUntil,
            },
          });
          // Caller too — quieter UX ("Connecting you to {pro}…") but
          // useful when the caller has a different device foregrounded.
          await insertEvent(client, {
            aggregateType: OutboxAggregateType.CALL,
            aggregateId: row.id,
            eventType: OutboxEventType.PUSH_CALL_JOINABLE,
            payload: {
              call_id: row.id,
              target_user_id: booking.caller_user_id,
              peer_user_id: booking.callee_user_id,
              peer_full_name: callee?.full_name ?? null,
              peer_avatar_url: callee?.avatar_url ?? null,
              kind: booking.call_type,
              polite_decline_until: politeDeclineUntil,
            },
          });
        }
      });
    }
    await client.query('COMMIT');
    // This worker resolves rings into `missed` and settles stale calls, both of
    // which move figures on a professional's dashboard. It manages its own
    // transaction rather than going through `withTransaction`, so it must flush
    // the queued busts itself — otherwise a professional's missed-call count
    // stays wrong until the TTL expires.
    await flushCacheInvalidations(client);
    if (rows.length > 0) logger.info({ flipped: rows.length }, 'call-starter cron flipped');
  } catch (err) {
    discardCacheInvalidations(client);
    await client.query('ROLLBACK').catch(() => {});
    logger.warn({ err }, 'call-starter tick failed');
  } finally {
    client.release();
  }
};

const tickNoShowResolver = async (): Promise<void> => {
  const cfg = platformConfig.bookings();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await callsRepo.findCallsToResolveNoShow(
      client,
      cfg.no_show_grace_seconds,
      BATCH_SIZE,
    );
    for (const row of rows) {
      await runWithSavepoint(client, row.id, 'no-show-resolver', async () => {
        // If both have joined within grace, resolveCall in 'no_show_grace' mode
        // promotes to in_progress logic; the resolver handles that case.
        await resolveCall(client, row.id, 'no_show_grace');
      });
    }
    await client.query('COMMIT');
    // This worker resolves rings into `missed` and settles stale calls, both of
    // which move figures on a professional's dashboard. It manages its own
    // transaction rather than going through `withTransaction`, so it must flush
    // the queued busts itself — otherwise a professional's missed-call count
    // stays wrong until the TTL expires.
    await flushCacheInvalidations(client);
    if (rows.length > 0) logger.info({ resolved: rows.length }, 'no-show resolver cron');
  } catch (err) {
    discardCacheInvalidations(client);
    await client.query('ROLLBACK').catch(() => {});
    logger.warn({ err }, 'no-show resolver tick failed');
  } finally {
    client.release();
  }
};

const tickStuckCallResolver = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await callsRepo.findStuckInProgressCalls(client, STUCK_BUFFER_SECONDS, BATCH_SIZE);
    for (const row of rows) {
      await runWithSavepoint(client, row.id, 'stuck-call-resolver', async () => {
        await resolveCall(client, row.id, 'stuck_call');
      });
    }
    await client.query('COMMIT');
    // This worker resolves rings into `missed` and settles stale calls, both of
    // which move figures on a professional's dashboard. It manages its own
    // transaction rather than going through `withTransaction`, so it must flush
    // the queued busts itself — otherwise a professional's missed-call count
    // stays wrong until the TTL expires.
    await flushCacheInvalidations(client);
    if (rows.length > 0) logger.info({ resolved: rows.length }, 'stuck-call resolver cron');
  } catch (err) {
    discardCacheInvalidations(client);
    await client.query('ROLLBACK').catch(() => {});
    logger.warn({ err }, 'stuck-call resolver tick failed');
  } finally {
    client.release();
  }
};

const tickRingResolver = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await instantCallsRepo.findExpiredRinging(
      client,
      INSTANT_CALL_RING_SECONDS,
      BATCH_SIZE,
    );
    for (const row of rows) {
      await runWithSavepoint(client, row.id, 'ring-resolver', async () => {
        await instantCallsRepo.finalize(client, {
          callId: row.id,
          status: InstantCallStatus.MISSED,
          connectedSeconds: 0,
          settledKobo: 0n,
          settlementJournalId: null,
        });
        const caller = await authRepo.findUserById(row.caller_user_id);
        // Dismiss any ring UI still showing, on both sides.
        for (const targetUserId of [row.callee_user_id, row.caller_user_id]) {
          await insertEvent(client, {
            aggregateType: OutboxAggregateType.CALL,
            aggregateId: row.id,
            eventType: OutboxEventType.PUSH_CALL_CANCELLED,
            payload: { call_id: row.id, target_user_id: targetUserId, reason: 'timeout' },
          });
        }
        await recordCallEvent(client, {
          clientUserId: row.caller_user_id,
          professionalId: row.callee_user_id,
          callerUserId: row.caller_user_id,
          callId: row.id,
          callType: row.call_type,
          outcome: CallEventOutcome.MISSED,
        });
        // Visible "you missed a call from X" for the callee.
        await insertEvent(client, {
          aggregateType: OutboxAggregateType.CALL,
          aggregateId: row.id,
          eventType: OutboxEventType.PUSH_CALL_MISSED,
          payload: {
            call_id: row.id,
            target_user_id: row.callee_user_id,
            caller_user_id: row.caller_user_id,
            caller_full_name: caller?.full_name ?? null,
            caller_avatar_url: caller?.avatar_url ?? null,
            call_type: row.call_type,
          },
        });
      });
    }
    await client.query('COMMIT');
    // This worker resolves rings into `missed` and settles stale calls, both of
    // which move figures on a professional's dashboard. It manages its own
    // transaction rather than going through `withTransaction`, so it must flush
    // the queued busts itself — otherwise a professional's missed-call count
    // stays wrong until the TTL expires.
    await flushCacheInvalidations(client);
    if (rows.length > 0) logger.info({ resolved: rows.length }, 'ring-timeout resolver cron');
  } catch (err) {
    discardCacheInvalidations(client);
    await client.query('ROLLBACK').catch(() => {});
    logger.warn({ err }, 'ring-timeout resolver tick failed');
  } finally {
    client.release();
  }
};

// Active instant calls nobody ever ended. Both apps dying mid-call leaves the
// row `active` forever, and the one-live-call-per-callee index then rejects
// every future call to that professional — so this settles them for whatever
// the event log says was talked, on the same terms as a normal hangup.
const tickStaleActiveResolver = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const graceSeconds = platformConfig.bookings().stale_active_grace_seconds;
    const rows = await instantCallsRepo.findStaleActive(client, graceSeconds, BATCH_SIZE);
    for (const row of rows) {
      await runWithSavepoint(client, row.id, 'stale-active-resolver', async () => {
        const outcome = await settleActiveCall(client, row, row.connected_seconds);
        for (const targetUserId of [row.caller_user_id, row.callee_user_id]) {
          await insertEvent(client, {
            aggregateType: OutboxAggregateType.CALL,
            aggregateId: row.id,
            eventType: OutboxEventType.PUSH_CALL_CANCELLED,
            payload: { call_id: row.id, target_user_id: targetUserId, reason: 'timeout' },
          });
        }
        logger.info(
          {
            callId: row.id,
            billedSeconds: outcome.billedSeconds,
            source: outcome.source,
          },
          'stale active instant call settled',
        );
      });
    }
    await client.query('COMMIT');
    // This worker resolves rings into `missed` and settles stale calls, both of
    // which move figures on a professional's dashboard. It manages its own
    // transaction rather than going through `withTransaction`, so it must flush
    // the queued busts itself — otherwise a professional's missed-call count
    // stays wrong until the TTL expires.
    await flushCacheInvalidations(client);
  } catch (err) {
    discardCacheInvalidations(client);
    await client.query('ROLLBACK').catch(() => {});
    logger.warn({ err }, 'stale-active resolver tick failed');
  } finally {
    client.release();
  }
};

// Purchase intents whose window closed. Retiring them is bookkeeping rather
// than enforcement — verify already refuses a lapsed intent — but it keeps the
// pending index small and stops stale refs reading as actionable.
const tickIntentExpiry = async (): Promise<void> => {
  try {
    const expired = await expireStaleIntents(BATCH_SIZE);
    if (expired > 0) logger.info({ expired }, 'purchase intents expired');
  } catch (err) {
    logger.warn({ err }, 'intent expiry tick failed');
  }
};

const startInterval = (
  name: string,
  intervalMs: number,
  tick: () => Promise<void>,
  startupDelayMs: number,
): WorkerHandle => {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  const loop = async (): Promise<void> => {
    if (stopped) return;
    try {
      await tick();
    } catch (err) {
      logger.warn({ err, worker: name }, 'cron loop iteration crashed; continuing');
    }
    if (!stopped) {
      timer = setTimeout(() => {
        void loop();
      }, intervalMs);
      timer.unref();
    }
  };
  timer = setTimeout(() => {
    void loop();
  }, startupDelayMs);
  timer.unref();
  logger.info({ worker: name, intervalMs, startupDelayMs }, 'call cron worker started');
  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      return Promise.resolve();
    },
  };
};

interface CallsWorkersHandle {
  stop: () => Promise<void>;
}

// Invites resolve on a 10s cadence: a 30s deadline needs a tick fine enough
// that the overlay does not linger noticeably past it.
const INVITE_EXPIRY_INTERVAL_MS = 10_000;

const tickInviteExpiry = async (): Promise<void> => {
  await expireStaleInvites();
};

export interface CallsWorkersFlags {
  starter?: boolean;
  noShowResolver?: boolean;
  stuckCallResolver?: boolean;
  ringResolver?: boolean;
  staleActiveResolver?: boolean;
  intentExpiry?: boolean;
  inviteExpiry?: boolean;
}

// Each cron is independently toggleable. Skipped crons return a no-op handle
// so the caller's stop() stays uniform. Default for each flag is `true` —
// callers that pass nothing get every cron running.
export const startCallWorkers = (flags: CallsWorkersFlags = {}): CallsWorkersHandle => {
  const starterEnabled = flags.starter ?? true;
  const noShowEnabled = flags.noShowResolver ?? true;
  const stuckEnabled = flags.stuckCallResolver ?? true;
  const ringEnabled = flags.ringResolver ?? true;
  const staleActiveEnabled = flags.staleActiveResolver ?? true;
  const intentExpiryEnabled = flags.intentExpiry ?? true;
  const inviteExpiryEnabled = flags.inviteExpiry ?? true;

  const noop = { stop: (): Promise<void> => Promise.resolve() };

  // Stagger startup so they don't pile up at boot.
  const starter = starterEnabled
    ? startInterval('call-starter', STARTER_INTERVAL_MS, tickStarter, 5_000)
    : (logger.info({ worker: 'call-starter' }, 'worker disabled via env'), noop);
  const noShow = noShowEnabled
    ? startInterval('no-show-resolver', NO_SHOW_INTERVAL_MS, tickNoShowResolver, 10_000)
    : (logger.info({ worker: 'no-show-resolver' }, 'worker disabled via env'), noop);
  const stuck = stuckEnabled
    ? startInterval('stuck-call-resolver', STUCK_CALL_INTERVAL_MS, tickStuckCallResolver, 15_000)
    : (logger.info({ worker: 'stuck-call-resolver' }, 'worker disabled via env'), noop);
  const ring = ringEnabled
    ? startInterval('ring-timeout-resolver', RING_RESOLVER_INTERVAL_MS, tickRingResolver, 20_000)
    : (logger.info({ worker: 'ring-timeout-resolver' }, 'worker disabled via env'), noop);
  const staleActive = staleActiveEnabled
    ? startInterval(
        'stale-active-resolver',
        STALE_ACTIVE_INTERVAL_MS,
        tickStaleActiveResolver,
        25_000,
      )
    : (logger.info({ worker: 'stale-active-resolver' }, 'worker disabled via env'), noop);
  const intentExpiry = intentExpiryEnabled
    ? startInterval('intent-expiry', INTENT_EXPIRY_INTERVAL_MS, tickIntentExpiry, 30_000)
    : (logger.info({ worker: 'intent-expiry' }, 'worker disabled via env'), noop);

  const inviteExpiry = inviteExpiryEnabled
    ? startInterval('invite-expiry', INVITE_EXPIRY_INTERVAL_MS, tickInviteExpiry, 35_000)
    : (logger.info({ worker: 'invite-expiry' }, 'worker disabled via env'), noop);

  return {
    stop: async () => {
      await Promise.all([
        starter.stop(),
        noShow.stop(),
        stuck.stop(),
        ring.stop(),
        staleActive.stop(),
        intentExpiry.stop(),
        inviteExpiry.stop(),
      ]);
    },
  };
};
