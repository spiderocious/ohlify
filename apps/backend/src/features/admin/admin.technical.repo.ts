import { pool } from '@lib/db/pool.js';
import { redis } from '@lib/redis/client.js';

import type { LabelledCount, Window } from './admin.dashboard.repo.js';

/**
 * Infrastructure aggregates behind the technical dashboard.
 *
 * Distinct from `admin.dashboard.repo` because the questions are different in
 * kind: that file asks *how did the business do over a window*, this one asks
 * *is the machine healthy right now*. Almost nothing here takes a date range,
 * and the couple of things that do say so.
 *
 * Deliberately NOT covered, because neither is persisted:
 *
 *   **Per-request latency and error rates.** `requestLog` middleware emits
 *   method, path, status and duration to pino, never to a table. A p95 read
 *   off nothing would be an invented number.
 *
 *   **Worker cron heartbeats.** The loops in `calls.worker.ts` and the
 *   reconciliation worker do not record a last-run.
 */

// ── Service health ─────────────────────────────────────────────────────────

export interface DependencyProbe {
  key: string;
  state: 'ok' | 'degraded' | 'down';
  detail: string;
}

/**
 * Liveness with a latency number attached.
 *
 * A bare up/down tick cannot distinguish a healthy database from one
 * answering in 900ms, and the second case is the one that pages you at 3am —
 * so each probe reports how long it actually took.
 */
export const probeDependencies = async (): Promise<DependencyProbe[]> => {
  const timed = async (key: string, run: () => Promise<unknown>): Promise<DependencyProbe> => {
    const started = process.hrtime.bigint();
    try {
      await run();
      const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
      return {
        key,
        // Slow-but-answering is its own state. Reporting it as `ok` hides the
        // most useful early warning there is.
        state: ms > 250 ? 'degraded' : 'ok',
        detail: `${ms.toFixed(0)}ms`,
      };
    } catch (err) {
      return { key, state: 'down', detail: err instanceof Error ? err.message : 'unreachable' };
    }
  };

  return Promise.all([
    timed('db', () => pool.query('SELECT 1')),
    timed('redis', () => redis.ping()),
  ]);
};

export interface PoolSnapshot {
  total: number;
  idle: number;
  waiting: number;
  max: number;
}

/**
 * `pg` exposes these live on the Pool. A non-zero `waiting` is the earliest
 * warning of database saturation there is: every request in that queue is
 * already blocked before a single query runs.
 */
export const poolSnapshot = (): PoolSnapshot => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount,
  max: pool.options.max ?? 10,
});

export interface RedisSnapshot {
  used_memory_mb: number | null;
  connected_clients: number | null;
  evicted_keys: number | null;
  hit_rate_percent: number | null;
}

/**
 * Parses Redis `INFO` into a flat map.
 *
 * The format is `key:value` per line with `#` section headers, and CRLF rather
 * than LF — trimming each line handles the carriage returns without a second
 * pass.
 */
const parseInfo = (info: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const lines: readonly string[] = info.split('\n');
  for (const line of lines) {
    const trimmed = (line ?? '').trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
};

const num = (raw: string | undefined): number | null => {
  if (raw === undefined) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Redis `INFO`. Every field is nullable: a managed Redis may restrict INFO
 * sections, and a missing stat must render as "unknown" rather than as zero —
 * "0 evicted keys" and "we could not ask" are very different facts.
 */
export const redisSnapshot = async (): Promise<RedisSnapshot> => {
  try {
    const info = parseInfo(await redis.info());
    const hits = num(info['keyspace_hits']);
    const misses = num(info['keyspace_misses']);
    const total = (hits ?? 0) + (misses ?? 0);
    const memory = num(info['used_memory']);

    return {
      used_memory_mb: memory === null ? null : Math.round(memory / 1_048_576),
      connected_clients: num(info['connected_clients']),
      evicted_keys: num(info['evicted_keys']),
      hit_rate_percent:
        hits === null || total === 0 ? null : Math.round((hits / total) * 1000) / 10,
    };
  } catch {
    return {
      used_memory_mb: null,
      connected_clients: null,
      evicted_keys: null,
      hit_rate_percent: null,
    };
  }
};

export interface ProcessSnapshot {
  uptime_seconds: number;
  heap_used_mb: number;
  heap_total_mb: number;
  rss_mb: number;
  node_version: string;
  commit_sha: string | null;
  booted_at: string;
  migration_version: string | null;
}

const mb = (bytes: number): number => Math.round(bytes / 1_048_576);

export const processSnapshot = async (): Promise<ProcessSnapshot> => {
  const memory = process.memoryUsage();
  let migration: string | null = null;
  try {
    // node-pg-migrate's own bookkeeping table. Which migration the running
    // code actually sits on is the first thing worth knowing when a query
    // starts failing after a deploy.
    const res = await pool.query<{ name: string }>(
      'SELECT name FROM pgmigrations ORDER BY id DESC LIMIT 1',
    );
    migration = res.rows[0]?.name ?? null;
  } catch {
    migration = null;
  }

  return {
    uptime_seconds: Math.round(process.uptime()),
    heap_used_mb: mb(memory.heapUsed),
    heap_total_mb: mb(memory.heapTotal),
    rss_mb: mb(memory.rss),
    node_version: process.versions.node,
    commit_sha:
      process.env['RAILWAY_GIT_COMMIT_SHA']?.slice(0, 7) ??
      process.env['GIT_COMMIT_SHA']?.slice(0, 7) ??
      null,
    booted_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    migration_version: migration,
  };
};

// ── Outbox ─────────────────────────────────────────────────────────────────

export interface OutboxSnapshot {
  backlog: string;
  oldest_lag_seconds: string | null;
  dead_lettered: string;
  published_last_hour: string;
}

/**
 * Backlog depth is the obvious number and the less useful one. **Lag — the age
 * of the oldest unpublished row — is the health metric**: two thousand rows
 * draining in ten seconds is fine, and three rows stuck for an hour is an
 * outage nobody has noticed.
 *
 * Dead letters are exact rather than inferred: the worker stamps `last_error`
 * with a `permanent: ` prefix once `attempt_count` reaches its ceiling.
 */
export const outboxSnapshot = async (): Promise<OutboxSnapshot> => {
  const res = await pool.query<OutboxSnapshot>(
    `SELECT
       (SELECT COUNT(*) FROM outbox WHERE published_at IS NULL)::text AS backlog,
       (SELECT EXTRACT(EPOCH FROM (now() - MIN(created_at)))::bigint
          FROM outbox WHERE published_at IS NULL)::text AS oldest_lag_seconds,
       (SELECT COUNT(*) FROM outbox
         WHERE published_at IS NULL AND last_error LIKE 'permanent:%')::text AS dead_lettered,
       (SELECT COUNT(*) FROM outbox
         WHERE published_at > now() - INTERVAL '1 hour')::text AS published_last_hour`,
  );
  return res.rows[0]!;
};

export const outboxRetryHistogram = async (): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT CASE
              WHEN attempt_count = 0 THEN '0'
              WHEN attempt_count = 1 THEN '1'
              WHEN attempt_count = 2 THEN '2'
              WHEN attempt_count BETWEEN 3 AND 5 THEN '3-5'
              ELSE '6+'
            END AS label,
            COUNT(*)::text AS value
       FROM outbox
      WHERE published_at IS NULL
      GROUP BY 1
      ORDER BY 1`,
  );
  return res.rows;
};

export const outboxFailuresByType = async (): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT event_type AS label, COUNT(*)::text AS value
       FROM outbox
      WHERE published_at IS NULL AND last_error IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
  );
  return res.rows;
};

export interface DeadLetterRow {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  attempt_count: number;
  last_error: string | null;
  age_seconds: string;
}

export const outboxDeadLetters = async (limit = 20): Promise<DeadLetterRow[]> => {
  const res = await pool.query<DeadLetterRow>(
    `SELECT id, event_type, aggregate_type, aggregate_id, attempt_count,
            -- Strip the marker prefix; the UI already frames these as dead.
            regexp_replace(last_error, '^permanent: ', '') AS last_error,
            EXTRACT(EPOCH FROM (now() - created_at))::bigint::text AS age_seconds
       FROM outbox
      WHERE published_at IS NULL AND last_error LIKE 'permanent:%'
      ORDER BY created_at ASC
      LIMIT $1`,
    [limit],
  );
  return res.rows;
};

// ── Integrations ───────────────────────────────────────────────────────────

export interface WebhookHealthRow {
  unprocessed: string;
  oldest_unprocessed_seconds: string | null;
  errored: string;
  replayed: string;
}

export const webhookHealth = async (): Promise<WebhookHealthRow> => {
  const res = await pool.query<WebhookHealthRow>(
    `SELECT
       COUNT(*) FILTER (WHERE processed_at IS NULL)::text AS unprocessed,
       EXTRACT(EPOCH FROM (
         now() - MIN(received_at) FILTER (WHERE processed_at IS NULL)
       ))::bigint::text AS oldest_unprocessed_seconds,
       COUNT(*) FILTER (WHERE processing_error IS NOT NULL)::text AS errored,
       COUNT(*) FILTER (WHERE replay_count > 0)::text AS replayed
     FROM paystack_webhooks`,
  );
  return res.rows[0]!;
};

export interface WebhookTypeRow {
  event_type: string;
  received: string;
  processed: string;
  errored: string;
}

export const webhooksByType = async (window: Window): Promise<WebhookTypeRow[]> => {
  const res = await pool.query<WebhookTypeRow>(
    `SELECT event_type,
            COUNT(*)::text AS received,
            COUNT(*) FILTER (WHERE processed_at IS NOT NULL)::text AS processed,
            COUNT(*) FILTER (WHERE processing_error IS NOT NULL)::text AS errored
       FROM paystack_webhooks
      WHERE received_at >= $1 AND received_at < $2
      GROUP BY event_type
      ORDER BY 2 DESC`,
    [window.from, window.to],
  );
  return res.rows;
};

export interface DeviceTokenRow {
  total: string;
  ios: string;
  android: string;
  web: string;
}

export const deviceTokenSpread = async (): Promise<DeviceTokenRow> => {
  const res = await pool.query<DeviceTokenRow>(
    `SELECT COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE platform = 'ios')::text AS ios,
            COUNT(*) FILTER (WHERE platform = 'android')::text AS android,
            COUNT(*) FILTER (WHERE platform = 'web')::text AS web
       FROM device_tokens`,
  );
  return res.rows[0]!;
};

// ── API surface ────────────────────────────────────────────────────────────

export interface IdempotencyRow {
  keys_stored: string;
  replays: string;
}

/**
 * `idempotency_keys` stores `route` and `response_status`, so replay volume is
 * directly countable. A conflict — the same key arriving with a different
 * `request_hash` — is the interesting case and is rejected at write time
 * rather than stored, so it is not derivable here.
 */
export const idempotencyStats = async (window: Window): Promise<IdempotencyRow> => {
  const res = await pool.query<IdempotencyRow>(
    `SELECT COUNT(*)::text AS keys_stored,
            COUNT(*) FILTER (WHERE response_status = 200)::text AS replays
       FROM idempotency_keys
      WHERE created_at >= $1 AND created_at < $2`,
    [window.from, window.to],
  );
  return res.rows[0]!;
};

export const idempotencyByRoute = async (window: Window): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT route AS label, COUNT(*)::text AS value
       FROM idempotency_keys
      WHERE created_at >= $1 AND created_at < $2
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    [window.from, window.to],
  );
  return res.rows;
};

// ── Auth events ────────────────────────────────────────────────────────────

export interface AuthOutcomeRow {
  logins: string;
  login_failures: string;
  registrations: string;
  registration_failures: string;
  password_resets: string;
  suspicious_ips: string;
}

/**
 * Auth outcomes from the `auth_events` log.
 *
 * `auth_sessions` only ever recorded successes — a rejected password landed
 * nowhere — so failure counts were previously underivable. The log fixes that
 * and is also what lockout and abuse detection need.
 *
 * "Suspicious" is five or more failures from one address inside the window.
 * Deliberately a low bar: this is a signal to look, not a decision to block.
 */
export const authOutcomes = async (window: Window): Promise<AuthOutcomeRow> => {
  const res = await pool.query<AuthOutcomeRow>(
    `SELECT
       COUNT(*) FILTER (WHERE event = 'login' AND outcome = 'success')::text AS logins,
       COUNT(*) FILTER (WHERE event = 'login' AND outcome = 'failure')::text AS login_failures,
       COUNT(*) FILTER (WHERE event = 'register' AND outcome = 'success')::text AS registrations,
       COUNT(*) FILTER (WHERE event = 'register' AND outcome = 'failure')::text
         AS registration_failures,
       COUNT(*) FILTER (WHERE event = 'password_reset' AND outcome = 'success')::text
         AS password_resets,
       (SELECT COUNT(*) FROM (
          SELECT ip FROM auth_events
           WHERE outcome = 'failure' AND ip IS NOT NULL
             AND created_at >= $1 AND created_at < $2
           GROUP BY ip HAVING COUNT(*) >= 5
        ) s)::text AS suspicious_ips
     FROM auth_events
    WHERE created_at >= $1 AND created_at < $2`,
    [window.from, window.to],
  );
  return res.rows[0]!;
};

export const authFailureReasons = async (window: Window): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT COALESCE(reason, 'unknown') AS label, COUNT(*)::text AS value
       FROM auth_events
      WHERE outcome = 'failure' AND created_at >= $1 AND created_at < $2
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    [window.from, window.to],
  );
  return res.rows;
};

export interface AuthEventRow {
  id: string;
  event: string;
  outcome: string;
  reason: string | null;
  subject: string | null;
  ip: string | null;
  platform: string | null;
  app_version: string | null;
  created_at: Date;
}

export const recentAuthEvents = async (limit = 20): Promise<AuthEventRow[]> => {
  const res = await pool.query<AuthEventRow>(
    `SELECT id, event, outcome, reason, subject, host(ip) AS ip,
            platform, app_version, created_at
       FROM auth_events
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows;
};

// ── Integrity ──────────────────────────────────────────────────────────────

export interface IntegrityRow {
  unsettled_calls: string;
  expired_intents: string;
  orphan_device_tokens: string;
}

export const integrityChecks = async (): Promise<IntegrityRow> => {
  const res = await pool.query<IntegrityRow>(
    `SELECT
       (SELECT COUNT(*) FROM instant_calls
         WHERE status = 'ended' AND settlement_journal_id IS NULL
           AND connected_seconds > 0)::text AS unsettled_calls,
       (SELECT COUNT(*) FROM purchase_intents
         WHERE satisfied_at IS NULL AND expires_at < now())::text AS expired_intents,
       (SELECT COUNT(*) FROM device_tokens dt
         WHERE NOT EXISTS (
           SELECT 1 FROM users u WHERE u.id = dt.user_id AND u.deleted_at IS NULL
         ))::text AS orphan_device_tokens`,
  );
  return res.rows[0]!;
};

// ── Config & release ───────────────────────────────────────────────────────

export interface ConfigSummaryRow {
  total_keys: string;
  public_keys: string;
  changed_this_week: string;
}

export const configSummary = async (): Promise<ConfigSummaryRow> => {
  const res = await pool.query<ConfigSummaryRow>(
    `SELECT COUNT(*)::text AS total_keys,
            COUNT(*) FILTER (WHERE is_public)::text AS public_keys,
            COUNT(*) FILTER (WHERE updated_at > now() - INTERVAL '7 days')::text
              AS changed_this_week
       FROM platform_config`,
  );
  return res.rows[0]!;
};

export interface ConfigChangeRow {
  key: string;
  value: unknown;
  is_public: boolean;
  updated_at: Date;
  updated_by_email: string | null;
}

export const recentConfigChanges = async (limit = 10): Promise<ConfigChangeRow[]> => {
  const res = await pool.query<ConfigChangeRow>(
    `SELECT c.key, c.value, c.is_public, c.updated_at, au.email AS updated_by_email
       FROM platform_config c
       LEFT JOIN admin_users au ON au.id = c.updated_by
      WHERE c.updated_by IS NOT NULL
      ORDER BY c.updated_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows;
};

export interface VersionGateStat {
  platform: string;
  min_version: string;
  forced: boolean;
  sessions_below: string;
}

/**
 * Version gates with the number an operator actually wants before raising a
 * minimum: how many live sessions the change would lock out.
 *
 * The comparison is lexical on padded segments rather than semver-aware —
 * Postgres has no version type, and padding each dotted segment to four digits
 * orders 1.10.0 after 1.9.0 correctly, which naive string compare does not.
 */
export const versionGateStats = async (): Promise<VersionGateStat[]> => {
  const res = await pool.query<VersionGateStat>(
    `WITH padded AS (
       SELECT s.platform,
              (SELECT string_agg(lpad(part, 4, '0'), '.')
                 FROM unnest(string_to_array(s.app_version, '.')) AS part) AS padded_version
         FROM auth_sessions s
        WHERE s.revoked_at IS NULL AND s.expires_at > now()
          AND s.app_version IS NOT NULL AND s.platform IS NOT NULL
     )
     SELECT v.platform,
            v.min_version,
            v.forced,
            COALESCE((
              SELECT COUNT(*) FROM padded p
               WHERE p.platform = v.platform
                 AND p.padded_version < (
                   SELECT string_agg(lpad(part, 4, '0'), '.')
                     FROM unnest(string_to_array(v.min_version, '.')) AS part
                 )
            ), 0)::text AS sessions_below
       FROM app_versions v
      ORDER BY v.platform`,
  );
  return res.rows;
};

// ── Realtime & call streams ────────────────────────────────────────────────

export interface CallStreamRow {
  server_events: string;
  client_events: string;
  missing_client_end: string;
  orphan_client_streams: string;
}

/**
 * The two call event logs, side by side.
 *
 * `call_events` is the server's account and `call_session_events` is the
 * client's. **The disagreement between them is the finding** — a call the
 * server closed with no client `ca:ended` is a real bug, and comparing the two
 * is the only way it surfaces.
 */
export const callStreams = async (window: Window): Promise<CallStreamRow> => {
  const res = await pool.query<CallStreamRow>(
    `SELECT
       (SELECT COUNT(*) FROM call_events
         WHERE occurred_at >= $1 AND occurred_at < $2)::text AS server_events,
       (SELECT COUNT(*) FROM call_session_events
         WHERE occurred_at >= $1 AND occurred_at < $2)::text AS client_events,
       (SELECT COUNT(*) FROM (
          SELECT call_id FROM call_session_events
           WHERE occurred_at >= $1 AND occurred_at < $2
           GROUP BY call_id
          HAVING COUNT(*) FILTER (WHERE event = 'ca:ended') = 0
        ) s)::text AS missing_client_end,
       (SELECT COUNT(*) FROM (
          SELECT cse.call_id FROM call_session_events cse
           WHERE cse.occurred_at >= $1 AND cse.occurred_at < $2
             AND NOT EXISTS (SELECT 1 FROM instant_calls ic WHERE ic.id = cse.call_id)
             AND NOT EXISTS (SELECT 1 FROM calls c WHERE c.id = cse.call_id)
           GROUP BY cse.call_id
        ) o)::text AS orphan_client_streams`,
    [window.from, window.to],
  );
  return res.rows[0]!;
};

export const clientEventMix = async (window: Window): Promise<LabelledCount[]> => {
  const res = await pool.query<LabelledCount>(
    `SELECT event AS label, COUNT(*)::text AS value
       FROM call_session_events
      WHERE occurred_at >= $1 AND occurred_at < $2
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    [window.from, window.to],
  );
  return res.rows;
};
