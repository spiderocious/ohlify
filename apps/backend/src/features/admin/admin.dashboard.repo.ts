import { pool } from '@lib/db/pool.js';

/**
 * Read-only aggregates behind the admin dashboards.
 *
 * Every query here is a single pass over an indexed column. There is no ETL
 * and no warehouse: these are operational tables answering operational
 * questions, which is exactly the tier the existing `admin.metrics` endpoints
 * were built at.
 *
 * Two rules hold throughout:
 *
 *   **Counts come back as `::text`.** `pg` returns `bigint` as a string
 *   anyway; casting explicitly means the row type never silently changes when
 *   a count crosses 2^31.
 *
 *   **Every window is a half-open `[from, to)`.** A closed upper bound
 *   double-counts the boundary row when two periods are compared, which is
 *   precisely what the delta calculations do.
 */

export interface Window {
  from: Date;
  to: Date;
}

export interface BucketRow {
  bucket: Date;
  value: string;
}

export type Granularity = 'hour' | 'day' | 'week';

/**
 * Buckets a window with `generate_series`, left-joined so empty buckets come
 * back as zero rather than missing.
 *
 * Without this a quiet Sunday vanishes from the x-axis and the chart draws
 * Saturday next to Monday as though they were adjacent — the line looks
 * continuous when it is not.
 */
const bucketed = async (
  table: string,
  timestampColumn: string,
  window: Window,
  granularity: Granularity,
  valueExpression = 'COUNT(*)',
  extraWhere = '',
): Promise<BucketRow[]> => {
  const res = await pool.query<BucketRow>(
    `WITH buckets AS (
       SELECT generate_series(
         date_trunc($3, $1::timestamptz),
         date_trunc($3, $2::timestamptz),
         ('1 ' || $3)::interval
       ) AS bucket
     )
     SELECT b.bucket,
            COALESCE(${valueExpression}, 0)::text AS value
       FROM buckets b
       LEFT JOIN ${table} t
         ON date_trunc($3, t.${timestampColumn}) = b.bucket
        AND t.${timestampColumn} >= $1 AND t.${timestampColumn} < $2
        ${extraWhere}
      GROUP BY b.bucket
      ORDER BY b.bucket ASC`,
    [window.from, window.to, granularity],
  );
  return res.rows;
};

// ── Money ──────────────────────────────────────────────────────────────────

export interface MoneyTotals {
  net_revenue_kobo: string;
  gross_volume_kobo: string;
  processor_fees_kobo: string;
  escrow_kobo: string;
}

/**
 * The four money figures, from the double-entry ledger rather than from any
 * denormalised counter.
 *
 * Revenue is the movement into `platform_revenue` over the window; escrow is
 * the *balance* of `minutes_escrow` right now, not a movement — money held is
 * a level, not a flow, and summing its movements would report something
 * meaningless.
 */
export const moneyTotals = async (window: Window): Promise<MoneyTotals> => {
  const res = await pool.query<MoneyTotals>(
    `SELECT
       COALESCE((
         SELECT SUM(we.signed_amount_kobo)
           FROM wallet_entries we
           JOIN accounts a ON a.id = we.account_id
          WHERE a.system_code = 'platform_revenue'
            AND we.created_at >= $1 AND we.created_at < $2
       ), 0)::text AS net_revenue_kobo,
       COALESCE((
         SELECT SUM(we.signed_amount_kobo)
           FROM wallet_entries we
           JOIN accounts a ON a.id = we.account_id
          WHERE a.kind = 'user'
            AND we.signed_amount_kobo > 0
            AND we.created_at >= $1 AND we.created_at < $2
       ), 0)::text AS gross_volume_kobo,
       COALESCE((
         SELECT SUM(we.signed_amount_kobo)
           FROM wallet_entries we
           JOIN accounts a ON a.id = we.account_id
          WHERE a.system_code IN ('paystack_fees', 'paystack_transfer_fees')
            AND we.created_at >= $1 AND we.created_at < $2
       ), 0)::text AS processor_fees_kobo,
       COALESCE((
         SELECT ab.balance_kobo
           FROM account_balances ab
           JOIN accounts a ON a.id = ab.account_id
          WHERE a.system_code = 'minutes_escrow'
          LIMIT 1
       ), 0)::text AS escrow_kobo`,
    [window.from, window.to],
  );
  return (
    res.rows[0] ?? {
      net_revenue_kobo: '0',
      gross_volume_kobo: '0',
      processor_fees_kobo: '0',
      escrow_kobo: '0',
    }
  );
};

export const revenueSeries = (window: Window, granularity: Granularity): Promise<BucketRow[]> =>
  bucketed(
    `(SELECT we.created_at, we.signed_amount_kobo
        FROM wallet_entries we
        JOIN accounts a ON a.id = we.account_id
       WHERE a.system_code = 'platform_revenue') `,
    'created_at',
    window,
    granularity,
    'SUM(t.signed_amount_kobo)',
  );

export interface CompositionRow {
  kind: string;
  total_kobo: string;
}

/** Revenue composition by `journal_entries.kind`. */
export const revenueComposition = async (window: Window): Promise<CompositionRow[]> => {
  const res = await pool.query<CompositionRow>(
    `SELECT je.kind::text AS kind,
            COALESCE(SUM(we.signed_amount_kobo), 0)::text AS total_kobo
       FROM journal_entries je
       JOIN wallet_entries we ON we.journal_id = je.id
       JOIN accounts a ON a.id = we.account_id
      WHERE a.system_code = 'platform_revenue'
        AND je.created_at >= $1 AND je.created_at < $2
      GROUP BY je.kind
      ORDER BY 2 DESC`,
    [window.from, window.to],
  );
  return res.rows;
};

export interface DriftRow {
  account_id: string;
  account_label: string;
  cached_balance_kobo: string;
  ledger_sum_kobo: string;
  drift_kobo: string;
}

/**
 * Per-account ledger drift.
 *
 * Double-entry makes the cached balance and the ledger sum equal by
 * construction — an AFTER INSERT trigger advances the cache under a per-account
 * advisory lock, and the tables are append-only. A row coming back here means
 * that path was bypassed, which is always a bug rather than a discrepancy.
 */
export const ledgerDrift = async (): Promise<DriftRow[]> => {
  const res = await pool.query<DriftRow>(
    `SELECT a.id AS account_id,
            a.label AS account_label,
            COALESCE(b.balance_kobo, 0)::text AS cached_balance_kobo,
            COALESCE(SUM(we.signed_amount_kobo), 0)::text AS ledger_sum_kobo,
            (COALESCE(SUM(we.signed_amount_kobo), 0) - COALESCE(b.balance_kobo, 0))::text AS drift_kobo
       FROM accounts a
       LEFT JOIN account_balances b ON b.account_id = a.id
       LEFT JOIN wallet_entries we ON we.account_id = a.id
      GROUP BY a.id, a.label, b.balance_kobo
     HAVING COALESCE(SUM(we.signed_amount_kobo), 0) <> COALESCE(b.balance_kobo, 0)
      ORDER BY a.id`,
  );
  return res.rows;
};

// ── Attention ──────────────────────────────────────────────────────────────

export interface AttentionRow {
  uncredited_payments: string;
  uncredited_oldest_seconds: string | null;
  suspense_kobo: string;
  withdrawals_stuck: string;
  withdrawals_oldest_seconds: string | null;
  kyc_pending: string;
  kyc_oldest_seconds: string | null;
  refunds_pending: string;
  refunds_oldest_seconds: string | null;
}

/**
 * The triage band. Deliberately unfiltered by date — these are now-facts, and
 * scoping them to a window would hide the item that has been stuck longest,
 * which is the only one that really matters.
 *
 * Ages come back in seconds so the client owns the formatting; a server-side
 * "3d ago" cannot be re-rendered when the page sits open.
 */
export const attention = async (): Promise<AttentionRow> => {
  const res = await pool.query<AttentionRow>(
    `SELECT
       (SELECT COUNT(*) FROM paystack_webhooks
         WHERE processed_at IS NULL)::text AS uncredited_payments,
       (SELECT EXTRACT(EPOCH FROM (now() - MIN(received_at)))::bigint FROM paystack_webhooks
         WHERE processed_at IS NULL)::text AS uncredited_oldest_seconds,
       COALESCE((SELECT ab.balance_kobo FROM account_balances ab
                   JOIN accounts a ON a.id = ab.account_id
                  WHERE a.system_code = 'suspense' LIMIT 1), 0)::text AS suspense_kobo,
       (SELECT COUNT(*) FROM withdrawals
         WHERE status IN ('pending','processing'))::text AS withdrawals_stuck,
       (SELECT EXTRACT(EPOCH FROM (now() - MIN(requested_at)))::bigint FROM withdrawals
         WHERE status IN ('pending','processing'))::text AS withdrawals_oldest_seconds,
       (SELECT COUNT(*) FROM kyc_submissions
         WHERE status = 'pending_review')::text AS kyc_pending,
       (SELECT EXTRACT(EPOCH FROM (now() - MIN(created_at)))::bigint FROM kyc_submissions
         WHERE status = 'pending_review')::text AS kyc_oldest_seconds,
       (SELECT COUNT(*) FROM refund_requests
         WHERE status = 'pending')::text AS refunds_pending,
       (SELECT EXTRACT(EPOCH FROM (now() - MIN(created_at)))::bigint FROM refund_requests
         WHERE status = 'pending')::text AS refunds_oldest_seconds`,
  );
  return res.rows[0]!;
};

// ── Calls ──────────────────────────────────────────────────────────────────

export interface CallTotals {
  live_now: string;
  ended: string;
  missed: string;
  cancelled: string;
  median_connected_seconds: string | null;
  median_ring_seconds: string | null;
}

export const callTotals = async (window: Window): Promise<CallTotals> => {
  const res = await pool.query<CallTotals>(
    `SELECT
       (SELECT COUNT(*) FROM instant_calls WHERE status = 'active')::text AS live_now,
       COUNT(*) FILTER (WHERE status = 'ended')::text AS ended,
       COUNT(*) FILTER (WHERE status = 'missed')::text AS missed,
       COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
       -- Median rather than mean: one four-hour outlier drags an average
       -- somewhere no real call ever sat.
       PERCENTILE_CONT(0.5) WITHIN GROUP (
         ORDER BY connected_seconds
       ) FILTER (WHERE status = 'ended' AND connected_seconds > 0)::text
         AS median_connected_seconds,
       PERCENTILE_CONT(0.5) WITHIN GROUP (
         ORDER BY EXTRACT(EPOCH FROM (connected_at - created_at))
       ) FILTER (WHERE connected_at IS NOT NULL)::text AS median_ring_seconds
     FROM instant_calls
    WHERE created_at >= $1 AND created_at < $2`,
    [window.from, window.to],
  );
  return res.rows[0]!;
};

export interface FunnelRow {
  booked: string;
  paid: string;
  started: string;
  completed: string;
}

/**
 * The scheduled-call funnel, from the live `call_status` enum.
 *
 * Note the stages are scheduled → waiting → started → completed, NOT
 * booked → paid → …: payment is settled before a `calls` row exists, so there
 * is no unpaid state to drop out of. What the funnel actually measures is
 * attendance — how many scheduled calls got both parties into the room — and
 * the enum splits its failures by side (`no_show_caller`, `no_show_callee`,
 * `disconnected_*`) rather than into one bucket.
 */
export const scheduledFunnel = async (window: Window): Promise<FunnelRow> => {
  const res = await pool.query<FunnelRow>(
    `SELECT
       COUNT(*)::text AS booked,
       COUNT(*) FILTER (
         WHERE status <> 'scheduled'
       )::text AS paid,
       COUNT(*) FILTER (
         WHERE status IN ('in_progress','completed','disconnected_caller','disconnected_callee')
       )::text AS started,
       COUNT(*) FILTER (WHERE status = 'completed')::text AS completed
     FROM calls
    WHERE created_at >= $1 AND created_at < $2`,
    [window.from, window.to],
  );
  return res.rows[0]!;
};

export interface LabelledCount {
  label: string;
  value: string;
}

/**
 * Client-emitted call telemetry.
 *
 * `call_session_events` is written directly by the mobile app and holds
 * thirteen event types. Two are failure signals nothing else in the stack
 * reports: `ca:permission-needed` (mic or camera denied) and a stream with no
 * terminating `ca:ended` (the app was killed mid-call).
 */
export const callQuality = async (window: Window): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT event AS label, COUNT(*)::text AS value
       FROM call_session_events
      WHERE occurred_at >= $1 AND occurred_at < $2
      GROUP BY event
      ORDER BY 2 DESC`,
    [window.from, window.to],
  );
  return res.rows;
};

/** Calls whose stream never carried a terminating `ca:ended`. */
export const callsWithoutClientEnd = async (window: Window): Promise<string> => {
  const res = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM (
         SELECT call_id
           FROM call_session_events
          WHERE occurred_at >= $1 AND occurred_at < $2
          GROUP BY call_id
         HAVING COUNT(*) FILTER (WHERE event = 'ca:ended') = 0
       ) s`,
    [window.from, window.to],
  );
  return res.rows[0]?.count ?? '0';
};

/** `payload.reason` on the terminating event. */
export const callEndReasons = async (window: Window): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT COALESCE(payload->>'reason', 'unknown') AS label,
            COUNT(*)::text AS value
       FROM call_session_events
      WHERE event = 'ca:ended'
        AND occurred_at >= $1 AND occurred_at < $2
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 8`,
    [window.from, window.to],
  );
  return res.rows;
};

export const callOutcomes = async (window: Window): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT status::text AS label, COUNT(*)::text AS value
       FROM instant_calls
      WHERE created_at >= $1 AND created_at < $2
        AND status IN ('ended','missed','cancelled')
      GROUP BY status
      ORDER BY 2 DESC`,
    [window.from, window.to],
  );
  return res.rows;
};

// ── Growth ─────────────────────────────────────────────────────────────────

export const signupSeries = (
  window: Window,
  granularity: Granularity,
  role: 'client' | 'professional',
): Promise<BucketRow[]> =>
  bucketed(
    `(SELECT created_at, role FROM users WHERE deleted_at IS NULL AND role = '${role}') `,
    'created_at',
    window,
    granularity,
  );

export interface ActivationRow {
  registered: string;
  email_verified: string;
  phone_verified: string;
  kyc_submitted: string;
  kyc_approved: string;
  first_call: string;
}

/**
 * The activation funnel. Every stage is a timestamp column already on `users`,
 * so this needs no new schema — the last stage is the only join.
 */
export const activation = async (window: Window): Promise<ActivationRow> => {
  const res = await pool.query<ActivationRow>(
    `SELECT
       COUNT(*)::text AS registered,
       COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL)::text AS email_verified,
       COUNT(*) FILTER (WHERE phone_verified_at IS NOT NULL)::text AS phone_verified,
       COUNT(*) FILTER (WHERE kyc_submitted_at IS NOT NULL)::text AS kyc_submitted,
       COUNT(*) FILTER (WHERE kyc_status = 'approved')::text AS kyc_approved,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM instant_calls ic
          WHERE ic.caller_user_id = u.id OR ic.callee_user_id = u.id
       ))::text AS first_call
     FROM users u
    WHERE deleted_at IS NULL
      AND created_at >= $1 AND created_at < $2`,
    [window.from, window.to],
  );
  return res.rows[0]!;
};

export interface SupplyRow {
  approved: string;
  available_now: string;
  missing_rates: string;
  bookable: string;
}

/**
 * Supply health.
 *
 * `bookable` is the number that matters: approved AND available AND carrying
 * at least one rate. A professional with no rate never appears in search, so
 * they are supply the marketplace cannot actually sell.
 */
export const supplyHealth = async (): Promise<SupplyRow> => {
  const res = await pool.query<SupplyRow>(
    `SELECT
       COUNT(*) FILTER (WHERE kyc_status = 'approved')::text AS approved,
       COUNT(*) FILTER (WHERE kyc_status = 'approved' AND is_available)::text AS available_now,
       COUNT(*) FILTER (
         WHERE kyc_status = 'approved'
           AND NOT EXISTS (SELECT 1 FROM professional_rates r WHERE r.user_id = u.id AND r.deleted_at IS NULL)
       )::text AS missing_rates,
       COUNT(*) FILTER (
         WHERE kyc_status = 'approved'
           AND is_available
           AND EXISTS (SELECT 1 FROM professional_rates r WHERE r.user_id = u.id AND r.deleted_at IS NULL)
       )::text AS bookable
     FROM users u
    WHERE deleted_at IS NULL AND role = 'professional'`,
  );
  return res.rows[0]!;
};

export interface EngagementRow {
  dau: string;
  wau: string;
  mau: string;
  messages: string;
  schedules_accepted: string;
  schedules_declined: string;
}

export const engagement = async (window: Window): Promise<EngagementRow> => {
  const res = await pool.query<EngagementRow>(
    `SELECT
       (SELECT COUNT(*) FROM users
         WHERE deleted_at IS NULL AND last_seen_at > now() - INTERVAL '1 day')::text AS dau,
       (SELECT COUNT(*) FROM users
         WHERE deleted_at IS NULL AND last_seen_at > now() - INTERVAL '7 days')::text AS wau,
       (SELECT COUNT(*) FROM users
         WHERE deleted_at IS NULL AND last_seen_at > now() - INTERVAL '30 days')::text AS mau,
       (SELECT COUNT(*) FROM messages
         WHERE created_at >= $1 AND created_at < $2)::text AS messages,
       (SELECT COUNT(*) FROM messages
         WHERE schedule_status = 'accepted'
           AND created_at >= $1 AND created_at < $2)::text AS schedules_accepted,
       (SELECT COUNT(*) FROM messages
         WHERE schedule_status = 'declined'
           AND created_at >= $1 AND created_at < $2)::text AS schedules_declined`,
    [window.from, window.to],
  );
  return res.rows[0]!;
};

// ── Platform reach ─────────────────────────────────────────────────────────

/**
 * Client telemetry from `auth_sessions`.
 *
 * Real data rather than aspiration: the Flutter app sends platform, app
 * version, device model and OS version on sign-in, registration and
 * push-token registration, and there is a partial index on
 * `(platform, app_version) WHERE revoked_at IS NULL` built for this query.
 */
export const platformSplit = async (): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT COALESCE(platform, 'unknown') AS label, COUNT(*)::text AS value
       FROM auth_sessions
      WHERE revoked_at IS NULL AND expires_at > now()
      GROUP BY 1
      ORDER BY 2 DESC`,
  );
  return res.rows;
};

export interface VersionRow {
  version: string;
  platform: string;
  sessions: string;
}

export const versionAdoption = async (): Promise<VersionRow[]> => {
  const res = await pool.query<VersionRow>(
    `SELECT COALESCE(app_version, 'unknown') AS version,
            COALESCE(platform, 'unknown') AS platform,
            COUNT(*)::text AS sessions
       FROM auth_sessions
      WHERE revoked_at IS NULL AND expires_at > now()
      GROUP BY 1, 2
      ORDER BY COUNT(*) DESC
      LIMIT 12`,
  );
  return res.rows;
};

export const osSpread = async (): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT COALESCE(os_version, 'unknown') AS label, COUNT(*)::text AS value
       FROM auth_sessions
      WHERE revoked_at IS NULL AND expires_at > now()
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
  );
  return res.rows;
};

export const topDevices = async (): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT COALESCE(device_model, 'unknown') AS label, COUNT(*)::text AS value
       FROM auth_sessions
      WHERE revoked_at IS NULL AND expires_at > now() AND device_model IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
  );
  return res.rows;
};

export interface VersionGateRow {
  platform: string;
  min_version: string;
  forced: boolean;
}

export const versionGates = async (): Promise<VersionGateRow[]> => {
  const res = await pool.query<VersionGateRow>(
    'SELECT platform, min_version, forced FROM app_versions ORDER BY platform',
  );
  return res.rows;
};

export interface PushReachRow {
  registered_tokens: string;
  active_users: string;
}

export const pushReach = async (): Promise<PushReachRow> => {
  const res = await pool.query<PushReachRow>(
    `SELECT
       (SELECT COUNT(*) FROM device_tokens)::text AS registered_tokens,
       (SELECT COUNT(*) FROM users
         WHERE deleted_at IS NULL
           AND last_seen_at > now() - INTERVAL '7 days')::text AS active_users`,
  );
  return res.rows[0]!;
};

// ── Trust ──────────────────────────────────────────────────────────────────

export interface TrustRow {
  reports_pending: string;
  reports_oldest_seconds: string | null;
  average_rating: string | null;
  reviews_in_period: string;
  users_suspended: string;
  users_blocked: string;
}

export const trust = async (window: Window): Promise<TrustRow> => {
  const res = await pool.query<TrustRow>(
    `SELECT
       (SELECT COUNT(*) FROM reports WHERE status = 'pending')::text AS reports_pending,
       (SELECT EXTRACT(EPOCH FROM (now() - MIN(created_at)))::bigint FROM reports
         WHERE status = 'pending')::text AS reports_oldest_seconds,
       (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews
         WHERE created_at >= $1 AND created_at < $2)::text AS average_rating,
       (SELECT COUNT(*) FROM reviews
         WHERE created_at >= $1 AND created_at < $2)::text AS reviews_in_period,
       (SELECT COUNT(*) FROM users
         WHERE deleted_at IS NULL AND status = 'suspended')::text AS users_suspended,
       (SELECT COUNT(*) FROM users
         WHERE deleted_at IS NULL AND status = 'blocked')::text AS users_blocked`,
    [window.from, window.to],
  );
  return res.rows[0]!;
};

export const reportReasons = async (window: Window): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT reason_code AS label, COUNT(*)::text AS value
       FROM reports
      WHERE created_at >= $1 AND created_at < $2
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    [window.from, window.to],
  );
  return res.rows;
};

export const actionsByAdmin = async (window: Window): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT COALESCE(au.email, 'unknown') AS label,
            COUNT(*)::text AS value
       FROM admin_audit_log l
       LEFT JOIN admin_users au ON au.id = l.admin_user_id
      WHERE l.created_at >= $1 AND l.created_at < $2
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    [window.from, window.to],
  );
  return res.rows;
};

export interface RecentActionRow {
  id: string;
  actor: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: Date;
}

/**
 * The audit tail for the dashboard.
 *
 * Joined to `admin_users` so the panel can name the operator: the audit table
 * stores only `admin_user_id`, and a board showing raw ids makes the reader do
 * the lookup every time.
 */
export const recentActions = async (limit = 6): Promise<RecentActionRow[]> => {
  const res = await pool.query<RecentActionRow>(
    `SELECT l.id,
            COALESCE(au.email, 'system') AS actor,
            l.action,
            l.target_type,
            l.target_id,
            l.created_at
       FROM admin_audit_log l
       LEFT JOIN admin_users au ON au.id = l.admin_user_id
      ORDER BY l.created_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows;
};
