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

// Revenue snapshot — platform fee income + total processed volume,
// grouped by 7d / 30d / 90d windows. Reads from journal_entries with
// kind = 'call_settlement'. Money is denominated in kobo.
export const revenue = async () => {
  const result = await pool.query<{
    window: string;
    total_volume_kobo: string;
    total_fee_kobo: string;
    settlement_count: string;
  }>(
    `WITH windows AS (
       SELECT '7d' AS w, now() - INTERVAL '7 days' AS since
       UNION ALL SELECT '30d', now() - INTERVAL '30 days'
       UNION ALL SELECT '90d', now() - INTERVAL '90 days'
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
        GROUP BY j.id, j.created_at
     )
     SELECT w.w AS window,
            COALESCE(SUM(sl.volume_kobo), 0)::text AS total_volume_kobo,
            COALESCE(SUM(sl.fee_kobo), 0)::text AS total_fee_kobo,
            COUNT(sl.id)::text AS settlement_count
       FROM windows w
       LEFT JOIN settlement_lines sl ON sl.created_at >= w.since
       GROUP BY w.w
       ORDER BY w.w`,
  );

  return new ServiceSuccess(
    {
      windows: result.rows.map((r) => ({
        window: r.window,
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
