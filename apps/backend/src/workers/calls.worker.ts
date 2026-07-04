import type { PoolClient } from 'pg';

import * as authRepo from '@features/auth/auth.repo.js';
import * as bookingsRepo from '@features/bookings/bookings.repo.js';
import * as callsRepo from '@features/calls/calls.repo.js';
import { resolveCall } from '@features/calls/calls.resolver.js';
import { CallStatus } from '@features/calls/calls.types.js';
import { platformConfig } from '@lib/config/platform-config.service.js';
import { pool } from '@lib/db/pool.js';
import { logger } from '@lib/logger.js';
import { insertEvent, OutboxAggregateType, OutboxEventType } from '@lib/outbox/index.js';

// Three call cron jobs run on independent intervals:
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
// Each worker uses SELECT ... FOR UPDATE SKIP LOCKED so multiple instances
// can run in parallel without claiming the same row twice.

const STARTER_INTERVAL_MS = 30_000;
const NO_SHOW_INTERVAL_MS = 30_000;
const STUCK_CALL_INTERVAL_MS = 60_000;
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
    if (rows.length > 0) logger.info({ flipped: rows.length }, 'call-starter cron flipped');
  } catch (err) {
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
    if (rows.length > 0) logger.info({ resolved: rows.length }, 'no-show resolver cron');
  } catch (err) {
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
    if (rows.length > 0) logger.info({ resolved: rows.length }, 'stuck-call resolver cron');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.warn({ err }, 'stuck-call resolver tick failed');
  } finally {
    client.release();
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

export interface CallsWorkersFlags {
  starter?: boolean;
  noShowResolver?: boolean;
  stuckCallResolver?: boolean;
}

// Each cron is independently toggleable. Skipped crons return a no-op handle
// so the caller's stop() stays uniform. Default for each flag is `true` —
// callers that pass nothing get all three running.
export const startCallWorkers = (flags: CallsWorkersFlags = {}): CallsWorkersHandle => {
  const starterEnabled = flags.starter ?? true;
  const noShowEnabled = flags.noShowResolver ?? true;
  const stuckEnabled = flags.stuckCallResolver ?? true;

  const noop = { stop: (): Promise<void> => Promise.resolve() };

  // Stagger startup so all three don't pile-up at boot.
  const starter = starterEnabled
    ? startInterval('call-starter', STARTER_INTERVAL_MS, tickStarter, 5_000)
    : (logger.info({ worker: 'call-starter' }, 'worker disabled via env'), noop);
  const noShow = noShowEnabled
    ? startInterval('no-show-resolver', NO_SHOW_INTERVAL_MS, tickNoShowResolver, 10_000)
    : (logger.info({ worker: 'no-show-resolver' }, 'worker disabled via env'), noop);
  const stuck = stuckEnabled
    ? startInterval('stuck-call-resolver', STUCK_CALL_INTERVAL_MS, tickStuckCallResolver, 15_000)
    : (logger.info({ worker: 'stuck-call-resolver' }, 'worker disabled via env'), noop);

  return {
    stop: async () => {
      await Promise.all([starter.stop(), noShow.stop(), stuck.stop()]);
    },
  };
};
