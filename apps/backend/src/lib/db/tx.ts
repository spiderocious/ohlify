import type { PoolClient } from 'pg';

import {
  discardProDashboardInvalidations,
  flushProDashboardInvalidations,
} from '@features/professionals/pro-dashboard.cache.js';
import {
  discardJournalCacheInvalidations,
  flushJournalCacheInvalidations,
} from '@lib/wallet/journal.js';

import { pool } from './pool.js';

export const withTransaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    // After COMMIT, never before. Any journal posted on this client has now
    // moved money, so the dashboards that show it are stale. Non-throwing by
    // construction — a cache bust must not be able to fail a committed write.
    await flushCacheInvalidations(client);
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    discardCacheInvalidations(client);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Like withTransaction, but lets the callback abandon the work by returning a
 * value the caller deems a failure.
 *
 * Services signal failure by RETURNING a ServiceError rather than throwing, so
 * under plain withTransaction a rejected second step still commits whatever the
 * first step already wrote. Multi-step flows that must be all-or-nothing pass
 * `shouldCommit` to close that gap.
 */
export const withTransactionUnless = async <T>(
  fn: (client: PoolClient) => Promise<T>,
  shouldCommit: (result: T) => boolean,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    const committed = shouldCommit(result);
    await client.query(committed ? 'COMMIT' : 'ROLLBACK');
    // Only a real COMMIT earns a bust. Invalidating after a rollback would
    // refill the cache from the state the caller just abandoned.
    if (committed) {
      await flushCacheInvalidations(client);
    } else {
      discardCacheInvalidations(client);
    }
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    discardCacheInvalidations(client);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Runs every cache bust queued against a transaction that has just committed.
 *
 * Two queues, one call site. The money path queues through `postJournal`, which
 * knows the journal but not the users; the activity path queues user ids
 * directly, because a missed call or a read receipt posts no journal to read
 * users back from. Both defer to here so no caller has to remember either.
 *
 * Exported so the workers — which manage their own BEGIN/COMMIT rather than
 * going through these wrappers — can call it after their own commits.
 */
export const flushCacheInvalidations = async (runner: object): Promise<void> => {
  await flushJournalCacheInvalidations(runner);
  await flushProDashboardInvalidations(runner);
};

/** Drops queued busts for a transaction that rolled back. */
export const discardCacheInvalidations = (runner: object): void => {
  discardJournalCacheInvalidations(runner);
  discardProDashboardInvalidations(runner);
};
