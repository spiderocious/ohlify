import { pool } from '@lib/db/pool.js';
import { koboToJson } from '@lib/money.js';
import { ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

// Admin metrics — high-level platform health snapshots.
//
// All endpoints are READ-ONLY. They run a small handful of aggregate
// queries against operational tables. For real analytics we'd ETL into
// a warehouse; this is the "ops dashboard" view.

export const overview = async () => {
  // We run all queries in parallel — they don't share state.
  const [users, calls, completedToday, pendingKyc, pendingRefunds, pendingWithdrawals] =
    await Promise.all([
      pool.query<{
        total: string;
        active: string;
        suspended: string;
        blocked: string;
        professionals: string;
        clients: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE deleted_at IS NULL)::text AS total,
           COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'active')::text AS active,
           COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'suspended')::text AS suspended,
           COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'blocked')::text AS blocked,
           COUNT(*) FILTER (WHERE deleted_at IS NULL AND role = 'professional')::text AS professionals,
           COUNT(*) FILTER (WHERE deleted_at IS NULL AND role = 'client')::text AS clients
         FROM users`,
      ),
      pool.query<{
        in_progress: string;
        scheduled: string;
        completed_30d: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'in_progress')::text AS in_progress,
           COUNT(*) FILTER (WHERE status = 'scheduled')::text AS scheduled,
           COUNT(*) FILTER (WHERE status = 'completed' AND ended_at > now() - INTERVAL '30 days')::text AS completed_30d
         FROM calls`,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM calls
          WHERE status = 'completed' AND ended_at::date = CURRENT_DATE`,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM kyc_submissions WHERE status = 'pending_review'`,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM refund_requests WHERE status = 'pending'`,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM withdrawals
          WHERE status IN ('pending', 'processing')`,
      ),
    ]);

  const u = users.rows[0]!;
  const c = calls.rows[0]!;

  return new ServiceSuccess(
    {
      users: {
        total: Number(u.total),
        active: Number(u.active),
        suspended: Number(u.suspended),
        blocked: Number(u.blocked),
        by_role: {
          professionals: Number(u.professionals),
          clients: Number(u.clients),
        },
      },
      calls: {
        in_progress: Number(c.in_progress),
        scheduled: Number(c.scheduled),
        completed_30d: Number(c.completed_30d),
        completed_today: Number(completedToday.rows[0]!.count),
      },
      queues: {
        pending_kyc: Number(pendingKyc.rows[0]!.count),
        pending_refunds: Number(pendingRefunds.rows[0]!.count),
        pending_withdrawals: Number(pendingWithdrawals.rows[0]!.count),
      },
      generated_at: new Date().toISOString(),
    },
    MESSAGE_KEYS.ADMIN_METRICS_OVERVIEW_FETCHED,
  );
};

// Revenue time-series. Reads from journal_entries with kind =
// 'call_settlement'. Buckets by date_trunc(granularity). Money is
// denominated in kobo.
//
// Defaults: granularity=day, from=now-30d, to=now (matches the spec).
// Buckets are server-time (UTC). The mobile UI is responsible for
// rendering in the user's locale.
//
// Why a generate_series() outer join: ensures a row exists for every
// bucket in the requested range, even buckets with zero settlements.
// Lets the chart show a flat-line gap instead of skipping x-axis ticks.
export interface RevenueQuery {
  from?: Date;
  to?: Date;
  granularity?: 'day' | 'week' | 'month';
}

const DEFAULT_LOOKBACK_DAYS = 30;

export const revenue = async (q: RevenueQuery = {}) => {
  const granularity = q.granularity ?? 'day';
  const to = q.to ?? new Date();
  const from = q.from ?? new Date(to.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const result = await pool.query<{
    bucket_start: Date;
    total_volume_kobo: string;
    total_fee_kobo: string;
    settlement_count: string;
  }>(
    `WITH buckets AS (
       SELECT generate_series(
         date_trunc($3, $1::timestamptz),
         date_trunc($3, $2::timestamptz),
         ('1 ' || $3)::interval
       ) AS bucket_start
     ),
     settlement_lines AS (
       SELECT j.id, j.created_at,
              SUM(we.signed_amount_kobo) FILTER (WHERE we.signed_amount_kobo > 0) AS volume_kobo,
              SUM(we.signed_amount_kobo) FILTER (
                WHERE acct.system_code = 'platform_revenue'
              ) AS fee_kobo
         FROM journal_entries j
         JOIN wallet_entries we ON we.journal_id = j.id
         JOIN accounts acct ON acct.id = we.account_id
        WHERE j.kind = 'call_settlement'
          AND j.created_at >= $1::timestamptz
          AND j.created_at <  $2::timestamptz
        GROUP BY j.id, j.created_at
     )
     SELECT b.bucket_start,
            COALESCE(SUM(sl.volume_kobo), 0)::text AS total_volume_kobo,
            COALESCE(SUM(sl.fee_kobo), 0)::text AS total_fee_kobo,
            COUNT(sl.id)::text AS settlement_count
       FROM buckets b
       LEFT JOIN settlement_lines sl
         ON date_trunc($3, sl.created_at) = b.bucket_start
       GROUP BY b.bucket_start
       ORDER BY b.bucket_start ASC`,
    [from, to, granularity],
  );

  return new ServiceSuccess(
    {
      from: from.toISOString(),
      to: to.toISOString(),
      granularity,
      series: result.rows.map((r) => ({
        bucket_start: r.bucket_start.toISOString(),
        total_volume_kobo: koboToJson(BigInt(r.total_volume_kobo)),
        total_fee_kobo: koboToJson(BigInt(r.total_fee_kobo)),
        settlement_count: Number(r.settlement_count),
      })),
      generated_at: new Date().toISOString(),
    },
    MESSAGE_KEYS.ADMIN_METRICS_REVENUE_FETCHED,
  );
};

// Signup cohorts by week. Counts users created per ISO week, separated
// by role. We cap to the last 12 weeks — if you need deeper history,
// query the warehouse.
export const cohorts = async () => {
  const result = await pool.query<{
    week_start: Date;
    role: string;
    signups: string;
  }>(
    `SELECT date_trunc('week', created_at) AS week_start,
            role::text AS role,
            COUNT(*)::text AS signups
       FROM users
       WHERE created_at >= now() - INTERVAL '12 weeks'
       GROUP BY date_trunc('week', created_at), role
       ORDER BY week_start ASC, role ASC`,
  );

  return new ServiceSuccess(
    {
      weekly_signups: result.rows.map((r) => ({
        week_start: r.week_start.toISOString(),
        role: r.role,
        signups: Number(r.signups),
      })),
      generated_at: new Date().toISOString(),
    },
    MESSAGE_KEYS.ADMIN_METRICS_COHORTS_FETCHED,
  );
};
