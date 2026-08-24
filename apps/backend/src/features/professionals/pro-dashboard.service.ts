import * as authRepo from '@features/auth/auth.repo.js';
import type { UserRow } from '@features/auth/auth.types.js';
import * as walletRepo from '@features/wallet/wallet.repo.js';
import {
  journalKindToTxType,
  lookupWalletTxVocabulary,
} from '@features/wallet/wallet.vocabulary.js';
import { getOrCompute } from '@lib/cache/responseCache.js';
import { koboToJson } from '@lib/money.js';
import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import { DASHBOARD_CACHE_TTL, dashboardCacheKey } from './pro-dashboard.cache.js';
import * as repo from './pro-dashboard.repo.js';

const RECENT_CALL_LIMIT = 5;
const RECENT_TRANSACTION_LIMIT = 5;

/**
 * A period-over-period change, or an honest reason there isn't one.
 *
 * `percent` is null whenever no comparison can be made, and `label` says why
 * in words the client renders verbatim. The alternative — sending `0` — is the
 * bug this shape exists to prevent: a professional in their first week would
 * read "0.0%" as "flat", when the truth is "there is nothing to compare to
 * yet".
 */
interface EarningsDelta {
  percent: number | null;
  label: string | null;
}

/** No baseline period existed. */
const noComparison = (label: string): EarningsDelta => ({ percent: null, label });

/**
 * Percentage change from `previous` to `current`.
 *
 * Two cases have no honest percentage and are deliberately not forced into
 * one:
 *
 * **The baseline is zero.** Any increase from ₦0 is an infinite rise, and
 * rendering "+∞%" or clamping to some large number tells the reader nothing.
 * They get "first earnings" instead.
 *
 * **The period never happened.** A professional whose first credit landed
 * today has no yesterday, so `firstEarningAt` gates the whole comparison —
 * without it, someone's first day always reads as a fabricated 100% gain over
 * a period they were not trading in.
 */
const computeDelta = (
  currentKobo: bigint,
  previousKobo: bigint,
  windowStart: Date,
  firstEarningAt: Date | null,
  firstPeriodLabel: string,
): EarningsDelta => {
  if (firstEarningAt === null) return noComparison('no earnings yet');
  if (firstEarningAt >= windowStart) return noComparison(firstPeriodLabel);
  if (previousKobo === 0n) {
    return currentKobo === 0n
      ? noComparison('no change')
      : noComparison('first earnings');
  }

  // Done in floating point only after both operands are known non-zero and
  // safe: kobo amounts here are period sums, far inside 2^53.
  const change = Number(currentKobo - previousKobo) / Number(previousKobo);
  return { percent: Math.round(change * 1000) / 10, label: null };
};

/**
 * Exposed for tests only.
 *
 * The delta is the one figure on this dashboard that is derived rather than
 * read, which makes it the one that can lie — and every failure mode is a
 * pure-function case, testable without a database.
 */
export const computeDeltaForTest = computeDelta;

/**
 * Everything a professional's home screen needs, in one read.
 *
 * A professional's questions are different in kind from a client's — am I
 * reachable, what have I earned, what needs me — which is why they get their
 * own screen and their own endpoint rather than a filtered version of the
 * client's discovery feed.
 *
 * Cached per user for a short window and busted by every write that can move
 * a figure on it — see `pro-dashboard.cache.ts`.
 */
export const getProfessionalDashboard = async (userId: string) => {
  const user = await authRepo.findUserById(userId);
  if (!user || user.role !== 'professional') {
    return new ServiceError('forbidden', MESSAGE_KEYS.FORBIDDEN, 403);
  }

  // The authorization check sits OUTSIDE the cache on purpose. Caching a
  // response keyed only by user id is safe; caching the decision to serve it
  // is how a demoted professional keeps reading a dashboard they no longer
  // have a role for.
  const data = await getOrCompute(dashboardCacheKey(userId), DASHBOARD_CACHE_TTL, () =>
    loadDashboard(userId, user),
  );

  return new ServiceSuccess(data, MESSAGE_KEYS.HOME_FETCHED);
};

/**
 * The uncached read. Every piece is independent, so they fan out in parallel —
 * a slow transaction page should not hold up the earnings figure.
 */
const loadDashboard = async (userId: string, user: UserRow) => {
  const [earnings, attention, recentCalls, transactions] = await Promise.all([
    repo.readEarnings(userId),
    repo.readAttention(userId),
    repo.readRecentCalls(userId, RECENT_CALL_LIMIT),
    walletRepo.listUserTransactions({ userId, limit: RECENT_TRANSACTION_LIMIT }),
  ]);

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const firstEarningAt = earnings.first_earning_at;

  return {
    // The professional's single most important control. `is_available` has
    // existed on the backend all along with no UI anywhere.
    is_available: user.is_available,
    kyc_status: user.kyc_status,
    kyc_reject_reason: user.kyc_reject_reason ?? null,
    earnings: {
      today_kobo: koboToJson(BigInt(earnings.today_kobo)),
      week_kobo: koboToJson(BigInt(earnings.week_kobo)),
      withdrawable_kobo: koboToJson(BigInt(earnings.withdrawable_kobo)),
      // Sent as a structured delta rather than a bare number so the client
      // never has to decide what a missing comparison looks like.
      today_delta: computeDelta(
        BigInt(earnings.today_kobo),
        BigInt(earnings.prev_day_kobo),
        startOfToday,
        firstEarningAt,
        'first day',
      ),
      week_delta: computeDelta(
        BigInt(earnings.week_kobo),
        BigInt(earnings.prev_week_kobo),
        startOfWeek,
        firstEarningAt,
        'first week',
      ),
    },
    attention: {
      unread_messages: Number(attention.unread_messages),
      pending_schedules: Number(attention.pending_schedules),
      missed_calls_today: Number(attention.missed_calls_today),
    },
    recent_calls: recentCalls.map((c) => ({
      id: c.id,
      call_type: c.call_type,
      status: c.status,
      connected_seconds: c.connected_seconds,
      // Net of the platform fee — what the professional actually kept.
      earned_kobo: koboToJson(BigInt(c.settled_kobo)),
      peer_name: c.peer_name,
      peer_avatar_url: c.peer_avatar_url,
      created_at: c.created_at.toISOString(),
    })),
    // The same shape the wallet screen renders, down to the field names, and
    // built from the same vocabulary lookup. Two surfaces showing a person
    // their own money must not disagree about what a row is called.
    transactions: transactions.slice(0, RECENT_TRANSACTION_LIMIT).map((row) => {
      const signed = BigInt(row.signed_amount_kobo);
      const direction: 'credit' | 'debit' = signed > 0n ? 'credit' : 'debit';
      const vocab = lookupWalletTxVocabulary(row.journal_kind, direction);
      return {
        id: row.entry_id,
        type: journalKindToTxType(row.journal_kind),
        amount_kobo: koboToJson(signed),
        currency: row.currency,
        status: 'completed' as const,
        occurred_at: row.occurred_at.toISOString(),
        title: vocab.title,
        description: vocab.description,
        icon: vocab.icon,
        direction,
        reference: row.reference,
      };
    }),
  };
};
