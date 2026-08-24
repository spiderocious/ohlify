/**
 * The two admin dashboards' response contracts.
 *
 * Transcribed from live responses rather than from the service source, then
 * checked against `admin.dashboard.service.ts` / `admin.technical.service.ts`.
 * Both matter: the source says what is meant, the wire says what actually
 * arrives, and the gap between them is where contract bugs live.
 *
 * **Money is `number` in kobo.** `ResponseUtil` converts bigint to a JSON
 * number while it fits in the safe-integer range and to a string above it, so
 * a value beyond 2^53 kobo (about ₦90 trillion) would arrive as a string. At
 * this platform's scale that cannot happen, and typing every money field as
 * `number | string` would push a narrowing dance into every call site for a
 * case that will not occur.
 */

export const AdminDashboardRange = {
  TODAY: 'today',
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d',
} as const;
export type AdminDashboardRange = (typeof AdminDashboardRange)[keyof typeof AdminDashboardRange];

/** A bucketed time series. `bucket` is an ISO timestamp at UTC bucket start. */
export interface AdminSeriesPoint {
  bucket: string;
  value: number;
}

/** A labelled count — chart categories, groupings, breakdowns. */
export interface AdminLabelledPoint {
  label: string;
  value: number;
}

/**
 * A queue signal. `oldest_seconds` is null when the queue is empty — there is
 * no item to age — and the client must render that as "clear" rather than as
 * "0 seconds old".
 */
export interface AdminAttentionSignal {
  count: number;
  oldest_seconds: number | null;
}

export interface AdminDashboardAttention {
  uncredited_payments: AdminAttentionSignal;
  /** `count` is 0 or 1; the amount is what an operator needs. */
  suspense: { count: number; amount_kobo: number };
  withdrawals_stuck: AdminAttentionSignal;
  kyc_pending: AdminAttentionSignal;
  refunds_pending: AdminAttentionSignal;
}

/**
 * Deltas are `number | null`. Null means the previous period was empty, so no
 * percentage can be drawn — not that nothing changed. Render no badge.
 */
export interface AdminDashboardMoney {
  net_revenue_kobo: number;
  net_revenue_delta: number | null;
  gross_volume_kobo: number;
  gross_volume_delta: number | null;
  processor_fees_kobo: number;
  processor_fees_delta: number | null;
  /** A balance, not a movement — money held right now. */
  escrow_kobo: number;
  revenue_series: AdminSeriesPoint[];
  composition: AdminLabelledPoint[];
  ledger: { balanced: boolean; drift_accounts: number; difference_kobo: number };
}

export interface AdminDashboardCalls {
  live_now: number;
  /** Percentage, or null when no call in the window resolved either way. */
  answer_rate: number | null;
  /** Percentage POINTS, not a percentage change. */
  answer_rate_delta: number | null;
  median_connected_seconds: number;
  median_ring_seconds: number;
  outcomes: AdminLabelledPoint[];
  funnel: { booked: number; paid: number; started: number; completed: number };
  quality: {
    permission_blocked: number;
    ended_without_signal: number;
    token_renewals: number;
    backgrounded: number;
  };
  end_reasons: AdminLabelledPoint[];
}

export interface AdminDashboardGrowth {
  signups_clients: AdminSeriesPoint[];
  signups_professionals: AdminSeriesPoint[];
  activation: {
    registered: number;
    registered_delta: number | null;
    email_verified: number;
    phone_verified: number;
    phone_verified_delta: number | null;
    kyc_submitted: number;
    kyc_approved: number;
    kyc_approved_delta: number | null;
    first_call: number;
    first_call_delta: number | null;
  };
  supply: {
    bookable: number;
    approved: number;
    available_now: number;
    missing_rates: number;
  };
  engagement: {
    dau: number;
    wau: number;
    mau: number;
    messages: number;
    schedules_accepted: number;
    schedules_declined: number;
  };
}

export interface AdminDashboardPlatform {
  /** Labels include 'unknown' for sessions predating device telemetry. */
  split: AdminLabelledPoint[];
  versions: Array<{ version: string; platform: string; sessions: number }>;
  os_spread: AdminLabelledPoint[];
  top_devices: AdminLabelledPoint[];
  gates: Array<{ platform: string; min_version: string; forced: boolean }>;
  push: { registered_tokens: number; active_users: number };
}

export interface AdminDashboardTrust {
  reports_pending: number;
  reports_oldest_seconds: number | null;
  /** Null when no review landed in the window — not zero stars. */
  average_rating: number | null;
  reviews_in_period: number;
  users_suspended: number;
  users_blocked: number;
  report_reasons: AdminLabelledPoint[];
  actions_by_admin: AdminLabelledPoint[];
  /** The audit tail, with the operator resolved to an email rather than an id. */
  recent_actions: Array<{
    id: string;
    actor: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    created_at: string;
  }>;
}

export interface AdminDashboard {
  range: AdminDashboardRange;
  granularity: 'hour' | 'day' | 'week';
  window: { from: string; to: string };
  attention: AdminDashboardAttention;
  /**
   * **Null for roles that may not see money** (support). Gated in the service,
   * not just the UI — the figures are absent from the payload rather than
   * hidden after arrival.
   */
  money: AdminDashboardMoney | null;
  calls: AdminDashboardCalls;
  growth: AdminDashboardGrowth;
  platform: AdminDashboardPlatform;
  trust: AdminDashboardTrust;
  generated_at: string;
}

// ── Technical ──────────────────────────────────────────────────────────────

export interface AdminDependencyProbe {
  key: string;
  state: 'ok' | 'degraded' | 'down';
  /** Latency, or the error message when down. */
  detail: string;
}

export interface AdminTechnicalHealth {
  dependencies: AdminDependencyProbe[];
  pool: { total: number; idle: number; waiting: number; max: number };
  /** Every field nullable: a managed Redis may restrict INFO sections. */
  redis: {
    used_memory_mb: number | null;
    connected_clients: number | null;
    evicted_keys: number | null;
    hit_rate_percent: number | null;
  };
  process: {
    uptime_seconds: number;
    heap_used_mb: number;
    heap_total_mb: number;
    rss_mb: number;
    node_version: string;
    /** Null outside a deploy that sets the commit env var. */
    commit_sha: string | null;
    booted_at: string;
    migration_version: string | null;
  };
}

export interface AdminOutboxDeadLetter {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  attempts: number;
  error: string | null;
  age_seconds: number;
}

export interface AdminTechnicalOutbox {
  backlog: number;
  /** Age of the oldest unpublished row. The health metric, not depth. */
  oldest_lag_seconds: number | null;
  dead_lettered: number;
  published_last_hour: number;
  retries: AdminLabelledPoint[];
  failures_by_type: AdminLabelledPoint[];
  dead_letters: AdminOutboxDeadLetter[];
}

export interface AdminTechnicalIntegrations {
  webhooks: {
    unprocessed: number;
    oldest_unprocessed_seconds: number | null;
    errored: number;
    replayed: number;
    by_type: Array<{
      event_type: string;
      received: number;
      processed: number;
      errored: number;
    }>;
  };
  push: { registered_tokens: number; ios: number; android: number; web: number };
  /** False means every Agora delivery is accepted unverified. */
  agora: { signature_verification_enabled: boolean };
}

export interface AdminAuthEvent {
  id: string;
  event: string;
  outcome: string;
  reason: string | null;
  subject: string | null;
  ip: string | null;
  platform: string | null;
  app_version: string | null;
  created_at: string;
}

export interface AdminTechnicalApi {
  idempotency: { keys_stored: number; replays: number; by_route: AdminLabelledPoint[] };
  auth: {
    logins: number;
    login_failures: number;
    registrations: number;
    registration_failures: number;
    password_resets: number;
    /** Distinct addresses with 5+ failures in the window. */
    suspicious_ips: number;
    failure_reasons: AdminLabelledPoint[];
    recent: AdminAuthEvent[];
  };
}

export interface AdminTechnicalIntegrity {
  ledger_balanced: boolean;
  drift_accounts: Array<{
    account_id: string;
    label: string;
    cached_kobo: number;
    ledger_kobo: number;
    drift_kobo: number;
  }>;
  unsettled_calls: number;
  expired_intents: number;
  orphan_device_tokens: number;
}

export interface AdminTechnicalConfig {
  total_keys: number;
  public_keys: number;
  changed_this_week: number;
  recent_changes: Array<{
    key: string;
    /** JSON-encoded — the column is jsonb and holds any shape. */
    value: string;
    is_public: boolean;
    updated_at: string;
    updated_by: string | null;
  }>;
  version_gates: Array<{
    platform: string;
    min_version: string;
    forced: boolean;
    /** Live sessions a forced upgrade would lock out. */
    sessions_below: number;
  }>;
}

export interface AdminTechnicalDashboard {
  range: AdminDashboardRange;
  window: { from: string; to: string };
  health: AdminTechnicalHealth;
  outbox: AdminTechnicalOutbox;
  integrations: AdminTechnicalIntegrations;
  api: AdminTechnicalApi;
  /** Per PROCESS — the SSE registry is in-memory, not shared. */
  realtime: { connections: number; distinct_users: number };
  integrity: AdminTechnicalIntegrity;
  config: AdminTechnicalConfig;
  call_streams: {
    server_events: number;
    client_events: number;
    /** Server closed the call; the client never reported `ca:ended`. */
    missing_client_end: number;
    orphan_client_streams: number;
    client_event_mix: AdminLabelledPoint[];
  };
  generated_at: string;
}
