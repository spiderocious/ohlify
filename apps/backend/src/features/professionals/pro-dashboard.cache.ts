import { invalidate } from '@lib/cache/responseCache.js';
import { logger } from '@lib/logger.js';
import { pool } from '@lib/db/pool.js';

/**
 * How long a dashboard read stays cached.
 *
 * Short on purpose. The invalidation hooks below cover every write we own, but
 * the dashboard also reflects things no request mutates — a call ageing out of
 * "today", the 7-day window sliding — and a TTL is the only thing that catches
 * those. Sixty seconds is short enough that a missed bust self-heals within a
 * pull-to-refresh, and long enough to absorb the repeated fetches a screen
 * makes while a professional flicks between tabs.
 */
export const DASHBOARD_CACHE_TTL = 60;

export const dashboardCacheKey = (userId: string): string => `pro:dashboard:${userId}`;

/**
 * Drops a professional's cached dashboard.
 *
 * Best-effort by construction — `invalidate` swallows Redis failures — because
 * a cache bust must never fail the write it follows. A stale dashboard is a
 * cosmetic problem for at most [DASHBOARD_CACHE_TTL] seconds; a rolled-back
 * settlement because Redis blinked is a real one.
 */
export const invalidateProDashboard = async (userId: string): Promise<void> => {
  await invalidate(dashboardCacheKey(userId));
};

/**
 * Users whose dashboard must be busted when a caller-owned transaction commits.
 *
 * The money path defers through `postJournal`, but plenty of dashboard figures
 * move without any money changing hands — a call going to `missed`, a schedule
 * proposal being answered, a message arriving. Those writes have no journal to
 * read users back from, so the caller names the user directly and this queue
 * holds it until COMMIT.
 *
 * Weak-keyed on the transaction runner so concurrent transactions cannot see
 * each other's pending work, and so a client released without flushing is
 * collected rather than leaked.
 */
const pendingUsers = new WeakMap<object, Set<string>>();

/**
 * Queues a dashboard bust for after this transaction commits.
 *
 * Safe to call more than once for the same user in one transaction — the set
 * dedupes, so a flow that touches a professional three times still issues one
 * Redis delete.
 */
export const queueProDashboardInvalidation = (runner: object, userId: string): void => {
  const queued = pendingUsers.get(runner) ?? new Set<string>();
  queued.add(userId);
  pendingUsers.set(runner, queued);
};

/** Runs the queued busts. Called by the transaction wrapper after COMMIT. */
export const flushProDashboardInvalidations = async (runner: object): Promise<void> => {
  const userIds = pendingUsers.get(runner);
  if (userIds === undefined) return;
  pendingUsers.delete(runner);
  await invalidate(...[...userIds].map(dashboardCacheKey));
};

/** Discards queued busts for a transaction that rolled back. */
export const discardProDashboardInvalidations = (runner: object): void => {
  pendingUsers.delete(runner);
};

/**
 * Drops the dashboards of every user with a line in a journal.
 *
 * Money always moves between at least two accounts, and a settlement credits
 * the professional while debiting the client — so a caller that only knew to
 * bust "the user who acted" would leave the other side stale. Rather than make
 * every flow remember who else it touched, this reads the journal's own lines
 * back and busts whoever is actually on them.
 *
 * Deliberately fails soft and never throws: it runs *after* a committed
 * journal, so there is nothing left to roll back and a thrown error here would
 * turn a successful payment into an apparent failure.
 */
export const invalidateDashboardsForJournal = async (journalId: string): Promise<void> => {
  try {
    const res = await pool.query<{ owner_user_id: string }>(
      `SELECT DISTINCT a.owner_user_id
         FROM wallet_entries we
         JOIN accounts a ON a.id = we.account_id
        WHERE we.journal_id = $1
          AND a.owner_user_id IS NOT NULL`,
      [journalId],
    );
    const keys = res.rows.map((r) => dashboardCacheKey(r.owner_user_id));
    if (keys.length > 0) await invalidate(...keys);
  } catch (err) {
    // A missed bust costs at most one TTL of staleness. Losing the write it
    // followed would cost real money.
    logger.warn({ err, journalId }, 'dashboard cache invalidation failed after journal post');
  }
};
