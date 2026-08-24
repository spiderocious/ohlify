import { ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './admin.dashboard.repo.js';
import type { Granularity, Window } from './admin.dashboard.repo.js';

/**
 * The business dashboard, as one composed read.
 *
 * A single endpoint rather than nine: the page draws every section at once, so
 * nine round trips would only add nine chances for one to fail and leave the
 * board half-rendered. The queries run concurrently and share one window, which
 * also guarantees the sections agree with each other — nine separate requests
 * spanning a bucket boundary would not.
 */

export const DASHBOARD_RANGES = ['today', '7d', '30d', '90d'] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

const RANGE_SPEC: Record<DashboardRange, { days: number; granularity: Granularity }> = {
  today: { days: 1, granularity: 'hour' },
  '7d': { days: 7, granularity: 'day' },
  '30d': { days: 30, granularity: 'day' },
  '90d': { days: 90, granularity: 'week' },
};

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ResolvedWindows {
  current: Window;
  /** The equal-length window immediately before, for deltas. */
  previous: Window;
  granularity: Granularity;
}

/**
 * Resolves a range name into two equal windows.
 *
 * The comparison window is the period immediately before, not the same period
 * last week — an operator asking "is this better than before?" means the run
 * they just had, and a fixed week-ago offset answers a different question.
 */
export const resolveWindows = (range: DashboardRange): ResolvedWindows => {
  const spec = RANGE_SPEC[range];
  const to = new Date();
  const from = new Date(to.getTime() - spec.days * DAY_MS);
  return {
    current: { from, to },
    previous: { from: new Date(from.getTime() - spec.days * DAY_MS), to: from },
    granularity: spec.granularity,
  };
};

/**
 * Percentage change between two periods, rounded to one decimal.
 *
 * Returns null rather than 0 when the previous period was empty. A jump from
 * nothing to something is not "0% change" and it is not "infinite growth"
 * either — it is a comparison that cannot be drawn, and the UI renders no
 * badge rather than a misleading one.
 */
const deltaPercent = (current: number, previous: number): number | null => {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
};

const toNumber = (raw: string | null | undefined): number => {
  if (raw === null || raw === undefined) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toSeries = (rows: repo.BucketRow[]) =>
  rows.map((row) => ({ bucket: row.bucket.toISOString(), value: toNumber(row.value) }));

const toPoints = (rows: repo.LabelledCount[]) =>
  rows.map((row) => ({ label: row.label, value: toNumber(row.value) }));

/** `null` when the queue is empty — there is no "oldest" item to age. */
const ageOf = (seconds: string | null): number | null =>
  seconds === null ? null : toNumber(seconds);

/**
 * Roles allowed to see money. Mirrors the FINANCE tuple the wallet routes use.
 *
 * The client already omits the money section for support, but a client-side
 * omission is a display choice, not an authorization boundary — the figures
 * would still be sitting in the response for anyone reading the network tab.
 * Gating it here means support genuinely cannot obtain them.
 */
const MONEY_ROLES: readonly string[] = ['admin', 'finance_ops'];

export const overview = async (range: DashboardRange, adminRole: string | undefined) => {
  const canSeeMoney = adminRole === undefined || MONEY_ROLES.includes(adminRole);
  const { current, previous, granularity } = resolveWindows(range);

  const [
    attention,
    money,
    moneyPrevious,
    revenueSeries,
    composition,
    drift,
    calls,
    callsPrevious,
    outcomes,
    funnel,
    quality,
    withoutClientEnd,
    endReasons,
    signupsClient,
    signupsPro,
    activation,
    activationPrevious,
    supply,
    engagement,
    platformSplit,
    versions,
    osSpread,
    devices,
    gates,
    pushReach,
    trust,
    reportReasons,
    actionsByAdmin,
    recentActions,
  ] = await Promise.all([
    repo.attention(),
    // Skipped entirely rather than fetched-then-dropped: a query whose result
    // the caller may not see should not run at all.
    canSeeMoney ? repo.moneyTotals(current) : null,
    canSeeMoney ? repo.moneyTotals(previous) : null,
    canSeeMoney ? repo.revenueSeries(current, granularity) : [],
    canSeeMoney ? repo.revenueComposition(current) : [],
    canSeeMoney ? repo.ledgerDrift() : [],
    repo.callTotals(current),
    repo.callTotals(previous),
    repo.callOutcomes(current),
    repo.scheduledFunnel(current),
    repo.callQuality(current),
    repo.callsWithoutClientEnd(current),
    repo.callEndReasons(current),
    repo.signupSeries(current, granularity, 'client'),
    repo.signupSeries(current, granularity, 'professional'),
    repo.activation(current),
    repo.activation(previous),
    repo.supplyHealth(),
    repo.engagement(current),
    repo.platformSplit(),
    repo.versionAdoption(),
    repo.osSpread(),
    repo.topDevices(),
    repo.versionGates(),
    repo.pushReach(),
    repo.trust(current),
    repo.reportReasons(current),
    repo.actionsByAdmin(current),
    repo.recentActions(),
  ]);

  const answered = toNumber(calls.ended);
  const missed = toNumber(calls.missed);
  const answerRate = answered + missed === 0 ? null : (answered / (answered + missed)) * 100;

  const previousAnswered = toNumber(callsPrevious.ended);
  const previousMissed = toNumber(callsPrevious.missed);
  const previousAnswerRate =
    previousAnswered + previousMissed === 0
      ? null
      : (previousAnswered / (previousAnswered + previousMissed)) * 100;

  const qualityCount = (event: string): number =>
    toNumber(quality.find((row) => row.label === event)?.value);

  return new ServiceSuccess(
    {
      range,
      granularity,
      window: { from: current.from.toISOString(), to: current.to.toISOString() },

      attention: {
        uncredited_payments: {
          count: toNumber(attention.uncredited_payments),
          oldest_seconds: ageOf(attention.uncredited_oldest_seconds),
        },
        // Any non-zero suspense balance is a bug, so the count is a boolean in
        // disguise — the amount is what an operator actually needs to see.
        suspense: {
          count: toNumber(attention.suspense_kobo) === 0 ? 0 : 1,
          amount_kobo: toNumber(attention.suspense_kobo),
        },
        withdrawals_stuck: {
          count: toNumber(attention.withdrawals_stuck),
          oldest_seconds: ageOf(attention.withdrawals_oldest_seconds),
        },
        kyc_pending: {
          count: toNumber(attention.kyc_pending),
          oldest_seconds: ageOf(attention.kyc_oldest_seconds),
        },
        refunds_pending: {
          count: toNumber(attention.refunds_pending),
          oldest_seconds: ageOf(attention.refunds_oldest_seconds),
        },
      },

      // `null` rather than zeroes: a support operator seeing ₦0 revenue would
      // reasonably conclude the platform earned nothing.
      money:
        !canSeeMoney || money === null || moneyPrevious === null
          ? null
          : {
              net_revenue_kobo: toNumber(money.net_revenue_kobo),
              net_revenue_delta: deltaPercent(
                toNumber(money.net_revenue_kobo),
                toNumber(moneyPrevious.net_revenue_kobo),
              ),
              gross_volume_kobo: toNumber(money.gross_volume_kobo),
              gross_volume_delta: deltaPercent(
                toNumber(money.gross_volume_kobo),
                toNumber(moneyPrevious.gross_volume_kobo),
              ),
              processor_fees_kobo: toNumber(money.processor_fees_kobo),
              processor_fees_delta: deltaPercent(
                toNumber(money.processor_fees_kobo),
                toNumber(moneyPrevious.processor_fees_kobo),
              ),
              escrow_kobo: toNumber(money.escrow_kobo),
              revenue_series: toSeries(revenueSeries),
              composition: composition.map((row) => ({
                label: row.kind,
                value: toNumber(row.total_kobo),
              })),
              ledger: {
                balanced: drift.length === 0,
                drift_accounts: drift.length,
                difference_kobo: drift.reduce((sum, row) => sum + toNumber(row.drift_kobo), 0),
              },
            },

      calls: {
        live_now: toNumber(calls.live_now),
        answer_rate: answerRate,
        answer_rate_delta:
          answerRate === null || previousAnswerRate === null
            ? null
            : Math.round((answerRate - previousAnswerRate) * 10) / 10,
        median_connected_seconds: toNumber(calls.median_connected_seconds),
        median_ring_seconds: toNumber(calls.median_ring_seconds),
        outcomes: toPoints(outcomes),
        funnel: {
          booked: toNumber(funnel.booked),
          paid: toNumber(funnel.paid),
          started: toNumber(funnel.started),
          completed: toNumber(funnel.completed),
        },
        quality: {
          permission_blocked: qualityCount('ca:permission-needed'),
          ended_without_signal: toNumber(withoutClientEnd),
          token_renewals: qualityCount('ca:renew-token'),
          backgrounded: qualityCount('ca:duration-paused'),
        },
        end_reasons: toPoints(endReasons),
      },

      growth: {
        signups_clients: toSeries(signupsClient),
        signups_professionals: toSeries(signupsPro),
        activation: {
          registered: toNumber(activation.registered),
          registered_delta: deltaPercent(
            toNumber(activation.registered),
            toNumber(activationPrevious.registered),
          ),
          email_verified: toNumber(activation.email_verified),
          phone_verified: toNumber(activation.phone_verified),
          phone_verified_delta: deltaPercent(
            toNumber(activation.phone_verified),
            toNumber(activationPrevious.phone_verified),
          ),
          kyc_submitted: toNumber(activation.kyc_submitted),
          kyc_approved: toNumber(activation.kyc_approved),
          kyc_approved_delta: deltaPercent(
            toNumber(activation.kyc_approved),
            toNumber(activationPrevious.kyc_approved),
          ),
          first_call: toNumber(activation.first_call),
          first_call_delta: deltaPercent(
            toNumber(activation.first_call),
            toNumber(activationPrevious.first_call),
          ),
        },
        supply: {
          bookable: toNumber(supply.bookable),
          approved: toNumber(supply.approved),
          available_now: toNumber(supply.available_now),
          missing_rates: toNumber(supply.missing_rates),
        },
        engagement: {
          dau: toNumber(engagement.dau),
          wau: toNumber(engagement.wau),
          mau: toNumber(engagement.mau),
          messages: toNumber(engagement.messages),
          schedules_accepted: toNumber(engagement.schedules_accepted),
          schedules_declined: toNumber(engagement.schedules_declined),
        },
      },

      platform: {
        split: toPoints(platformSplit),
        versions: versions.map((row) => ({
          version: row.version,
          platform: row.platform,
          sessions: toNumber(row.sessions),
        })),
        os_spread: toPoints(osSpread),
        top_devices: toPoints(devices),
        gates: gates.map((row) => ({
          platform: row.platform,
          min_version: row.min_version,
          forced: row.forced,
        })),
        push: {
          registered_tokens: toNumber(pushReach.registered_tokens),
          active_users: toNumber(pushReach.active_users),
        },
      },

      trust: {
        reports_pending: toNumber(trust.reports_pending),
        reports_oldest_seconds: ageOf(trust.reports_oldest_seconds),
        average_rating: trust.average_rating === null ? null : Number(trust.average_rating),
        reviews_in_period: toNumber(trust.reviews_in_period),
        users_suspended: toNumber(trust.users_suspended),
        users_blocked: toNumber(trust.users_blocked),
        report_reasons: toPoints(reportReasons),
        actions_by_admin: toPoints(actionsByAdmin),
        recent_actions: recentActions.map((row) => ({
          id: row.id,
          actor: row.actor,
          action: row.action,
          target_type: row.target_type,
          target_id: row.target_id,
          created_at: row.created_at.toISOString(),
        })),
      },

      generated_at: new Date().toISOString(),
    },
    MESSAGE_KEYS.ADMIN_METRICS_OVERVIEW_FETCHED,
  );
};
