import type { PoolClient } from 'pg';

import { invalidateDashboardsForJournal } from '@features/professionals/pro-dashboard.cache.js';
import { pool } from '@lib/db/pool.js';
import { id } from '@lib/ids.js';

import { assertBalanced, type JournalLineInput } from './accounting.js';

export interface PostJournalInput {
  kind:
    | 'wallet_funding'
    | 'wallet_funding_reversed'
    | 'call_payment_reserve'
    | 'call_settlement'
    | 'call_refund'
    | 'call_refund_post_settle'
    | 'minutes_purchase'
    | 'minutes_settlement'
    | 'withdrawal_requested'
    | 'withdrawal_completed'
    | 'withdrawal_reversed'
    | 'admin_credit'
    | 'admin_debit'
    | 'admin_manual'
    | 'platform_promo_grant';
  idempotencyKey: string;
  lines: JournalLineInput[];
  relatedCallId?: string;
  relatedPaymentId?: string;
  relatedWithdrawalId?: string;
  relatedUserId?: string;
  memo?: string;
  createdByAdminId?: string;
}

export interface PostJournalResult {
  journalId: string;
  alreadyPosted: boolean;
}

interface QueryRunner {
  query: PoolClient['query'];
}

/**
 * Journals posted inside a caller-owned transaction, awaiting that
 * transaction's COMMIT before their caches are busted.
 *
 * Keyed by the runner object itself so concurrent transactions cannot see each
 * other's pending work, and weak so a client that is released without ever
 * reaching `flushJournalCacheInvalidations` is collected rather than leaked.
 *
 * The alternative was a cache-bust call at each of the fifteen `postJournal`
 * sites, which is fifteen chances to forget one — and the one forgotten is
 * always the flow that matters.
 */
const pendingInvalidations = new WeakMap<object, string[]>();

/**
 * Busts the dashboard caches for every journal posted on this runner.
 *
 * Called by the transaction wrapper after COMMIT. Before COMMIT the journal is
 * not durable, and dropping a cache entry for a write that then rolls back
 * would refill the cache from the *old* state and leave it wrong until TTL —
 * strictly worse than not busting at all.
 */
export const flushJournalCacheInvalidations = async (runner: object): Promise<void> => {
  const journalIds = pendingInvalidations.get(runner);
  if (journalIds === undefined) return;
  pendingInvalidations.delete(runner);
  for (const journalId of journalIds) {
    await invalidateDashboardsForJournal(journalId);
  }
};

/** Discards pending busts for a transaction that rolled back. */
export const discardJournalCacheInvalidations = (runner: object): void => {
  pendingInvalidations.delete(runner);
};

// Posts a journal atomically: insert the header, then all lines, in one tx.
// Idempotent: if `idempotency_key` already exists, returns the existing
// journal id with `alreadyPosted: true` and inserts nothing.
//
// Optionally accepts an external client/tx (admin flows may want to bundle
// the journal into a larger tx alongside `withdrawals` row mutation, etc).
export const postJournal = async (
  input: PostJournalInput,
  runner?: QueryRunner,
): Promise<PostJournalResult> => {
  assertBalanced(input.lines);

  const exec = async (q: QueryRunner): Promise<PostJournalResult> => {
    // Try to insert the header. If the idempotency_key already exists, the
    // ON CONFLICT clause makes it a no-op and RETURNING is empty; we then
    // re-read the existing journal id.
    const headerInsert = await q.query<{ id: string }>(
      `INSERT INTO journal_entries (
         id, kind, idempotency_key,
         related_call_id, related_payment_id, related_withdrawal_id, related_user_id,
         memo, created_by_admin_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [
        id('je'),
        input.kind,
        input.idempotencyKey,
        input.relatedCallId ?? null,
        input.relatedPaymentId ?? null,
        input.relatedWithdrawalId ?? null,
        input.relatedUserId ?? null,
        input.memo ?? null,
        input.createdByAdminId ?? null,
      ],
    );

    if (!headerInsert.rows[0]) {
      const existing = await q.query<{ id: string }>(
        `SELECT id FROM journal_entries WHERE idempotency_key = $1 LIMIT 1`,
        [input.idempotencyKey],
      );
      const existingId = existing.rows[0]?.id;
      if (!existingId) {
        throw new Error(`journal idempotency conflict but row not found: ${input.idempotencyKey}`);
      }
      return { journalId: existingId, alreadyPosted: true };
    }

    const journalId = headerInsert.rows[0].id;

    // Build a single bulk INSERT for all lines. Using a VALUES clause keeps
    // the round-trip count to one regardless of line count.
    const params: unknown[] = [];
    const valueRows: string[] = [];
    let i = 0;
    for (const line of input.lines) {
      params.push(id('we'));
      params.push(journalId);
      params.push(line.accountId);
      params.push(line.signedAmountKobo);
      params.push(line.currency ?? 'NGN');
      valueRows.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`);
      i += 5;
    }
    await q.query(
      `INSERT INTO wallet_entries (id, journal_id, account_id, signed_amount_kobo, currency)
       VALUES ${valueRows.join(', ')}`,
      params,
    );

    return { journalId, alreadyPosted: false };
  };

  if (runner) {
    // Caller owns the transaction, so the bust is deferred to their COMMIT:
    // the journal is not durable yet, and dropping a cache entry for a write
    // that may still roll back would refill it from stale state.
    const result = await exec(runner);
    if (!result.alreadyPosted) {
      const queued = pendingInvalidations.get(runner) ?? [];
      queued.push(result.journalId);
      pendingInvalidations.set(runner, queued);
    }
    return result;
  }
  // No external tx — wrap our own. The deferred constraint trigger validates
  // sum-to-zero at COMMIT.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await exec(client);
    await client.query('COMMIT');
    // After COMMIT, never before: money has moved, so every dashboard showing
    // a balance or a period total is now wrong. Awaited but non-throwing —
    // `invalidateDashboardsForJournal` swallows its own failures, because a
    // Redis outage must not turn a completed payment into an error.
    if (!result.alreadyPosted) {
      await invalidateDashboardsForJournal(result.journalId);
    }
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};
