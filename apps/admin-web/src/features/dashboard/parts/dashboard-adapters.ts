import {
  IconAlertTriangle,
  IconBank,
  IconBell,
  IconClock,
  IconEscrow,
  IconIdCard,
  IconLedger,
  IconMicOff,
  IconPause,
  IconPhone,
  IconReceipt,
  IconRefresh,
  IconTrendingUp,
  IconUsers,
  IconVerified,
  IconWifiOff,
  IconWallet,
  type HawkChartPoint,
  type HawkIconComponent,
  type HawkKpi,
  type HawkStatDelta,
  type HawkStep,
} from '@ohlify/hawk-ui';
import type {
  AdminDashboard,
  AdminDashboardMoney,
  AdminLabelledPoint,
  AdminSeriesPoint,
} from '@ohlify/api';

import { RANGE_SPECS, type DashboardRange } from './dashboard-range.js';

/**
 * Maps the dashboard response onto the shapes Hawk renders.
 *
 * This layer exists so the section components stay declarative: they receive
 * `HawkKpi[]` and `HawkChartPoint[]` and know nothing about the wire format.
 * It replaced the fixtures file wholesale, which is why every function here
 * has the same signature the fixture constants used to have.
 */

/**
 * A delta badge, or nothing.
 *
 * The API sends `null` when the previous period was empty — no percentage can
 * honestly be drawn from a zero base. Returning undefined means the KPI cell
 * renders no badge at all, rather than a green "+0%" that implies flat.
 */
const delta = (
  percent: number | null,
  period: string,
  riseIsGood = true,
): HawkStatDelta | undefined => (percent === null ? undefined : { percent, period, riseIsGood });

const series = (points: readonly AdminSeriesPoint[], granularity: string): HawkChartPoint[] =>
  points.map((point) => ({
    label: formatBucket(point.bucket, granularity),
    value: point.value,
  }));

const points = (raw: readonly AdminLabelledPoint[]): HawkChartPoint[] =>
  raw.map((point) => ({ label: humanize(point.label), value: point.value }));

/** Sparkline input: the trend shape only, no labels. */
const trend = (raw: readonly AdminSeriesPoint[]): number[] => raw.map((point) => point.value);

function formatBucket(iso: string, granularity: string): string {
  const date = new Date(iso);
  if (granularity === 'hour') {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', timeZone: 'UTC' });
  }
  if (granularity === 'week') {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  }
  return date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
}

/** `no_show_caller` → `No show caller`. Enum values are not display strings. */
function humanize(value: string): string {
  const cleaned = value.replace(/^ca:/, '').replace(/[_-]+/g, ' ').trim();
  return cleaned.length === 0 ? value : cleaned[0]!.toUpperCase() + cleaned.slice(1);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/**
 * A queue age, from seconds.
 *
 * Formatted here rather than server-side so a board left open does not freeze
 * its own clock: the API sends an age in seconds and the client renders it.
 */
export function formatAge(seconds: number | null): string | undefined {
  if (seconds === null) return undefined;
  if (seconds < 3600) return `oldest ${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) return `oldest ${Math.round(seconds / 3600)}h`;
  const days = Math.floor(seconds / 86_400);
  const hours = Math.round((seconds % 86_400) / 3600);
  return hours === 0 ? `oldest ${days}d` : `oldest ${days}d ${hours}h`;
}

// ── Attention ──────────────────────────────────────────────────────────────

export const AttentionTone = { CRITICAL: 'critical', CAUTION: 'caution' } as const;
export type AttentionTone = (typeof AttentionTone)[keyof typeof AttentionTone];

export interface AttentionSignal {
  key: string;
  label: string;
  count: number;
  age?: string;
  hint: string;
  icon: HawkIconComponent;
  tone: AttentionTone;
  to: string;
}

/**
 * The triage band.
 *
 * Note the framing of the first signal: the *cause* is an unprocessed Paystack
 * webhook, but what an operator has to act on is a user who paid and was not
 * credited. The diagnostics live on the technical board; this states the
 * consequence and links there.
 */
export function toAttentionSignals(data: AdminDashboard): AttentionSignal[] {
  const a = data.attention;
  const all: AttentionSignal[] = [
    {
      key: 'uncredited_payments',
      label: 'Payments not credited',
      count: a.uncredited_payments.count,
      hint: 'Users who paid and were never credited. Diagnostics on the technical dashboard.',
      icon: IconReceipt,
      tone: AttentionTone.CRITICAL,
      to: '/technical',
    },
    {
      key: 'suspense',
      label: 'Suspense balance',
      count: a.suspense.count,
      hint: 'Money that did not know where to go. In double-entry this is never legitimately non-zero.',
      icon: IconLedger,
      tone: AttentionTone.CRITICAL,
      to: '/technical',
    },
    {
      key: 'withdrawals_stuck',
      label: 'Withdrawals in flight',
      count: a.withdrawals_stuck.count,
      hint: 'Money owed to professionals. One two-day-old is worse than ten one-hour-olds.',
      icon: IconBank,
      tone: AttentionTone.CRITICAL,
      to: '/withdrawals',
    },
    {
      key: 'kyc',
      label: 'KYC awaiting review',
      count: a.kyc_pending.count,
      hint: 'A professional cannot earn until this clears.',
      icon: IconIdCard,
      tone: AttentionTone.CAUTION,
      to: '/kyc',
    },
    {
      key: 'refunds',
      label: 'Refunds to decide',
      count: a.refunds_pending.count,
      hint: 'Human-decision queue.',
      icon: IconReceipt,
      tone: AttentionTone.CAUTION,
      to: '/refunds',
    },
  ];

  const ages: Record<string, string | undefined> = {
    uncredited_payments: formatAge(a.uncredited_payments.oldest_seconds),
    // The suspense signal's "age" is the amount — that is what needs acting on.
    suspense:
      a.suspense.amount_kobo === 0
        ? undefined
        : `₦${(a.suspense.amount_kobo / 100).toLocaleString()}`,
    withdrawals_stuck: formatAge(a.withdrawals_stuck.oldest_seconds),
    kyc: formatAge(a.kyc_pending.oldest_seconds),
    refunds: formatAge(a.refunds_pending.oldest_seconds),
  };

  // Zero-count signals are dropped, not greyed: a row of zeroes trains people
  // to skim past the band, which defeats the point of having one.
  return all
    .filter((signal) => signal.count > 0)
    .map((signal) => {
      const age = ages[signal.key];
      return age === undefined ? signal : { ...signal, age };
    });
}

// ── Money ──────────────────────────────────────────────────────────────────

export function toMoneyKpis(money: AdminDashboardMoney, range: DashboardRange): HawkKpi[] {
  const period = RANGE_SPECS[range].comparison;
  return [
    {
      key: 'net_revenue',
      label: 'Net revenue',
      valueKobo: money.net_revenue_kobo,
      icon: IconWallet,
      basis: 'net',
      ...(delta(money.net_revenue_delta, period)
        ? { delta: delta(money.net_revenue_delta, period)! }
        : {}),
      trend: trend(money.revenue_series),
      semantic: 'success',
    },
    {
      key: 'gross_volume',
      label: 'Gross volume',
      valueKobo: money.gross_volume_kobo,
      icon: IconReceipt,
      basis: 'gross',
      ...(delta(money.gross_volume_delta, period)
        ? { delta: delta(money.gross_volume_delta, period)! }
        : {}),
    },
    {
      key: 'processor_fees',
      label: 'Processor fees',
      valueKobo: money.processor_fees_kobo,
      icon: IconBank,
      // Fees growing is bad news, even though a growing number usually is not.
      ...(delta(money.processor_fees_delta, period, false)
        ? { delta: delta(money.processor_fees_delta, period, false)! }
        : {}),
      semantic: 'caution',
    },
    {
      key: 'escrow',
      label: 'Held in escrow',
      valueKobo: money.escrow_kobo,
      icon: IconEscrow,
    },
  ];
}

export const toRevenueSeries = (money: AdminDashboardMoney, granularity: string) =>
  series(money.revenue_series, granularity);

export const toComposition = (money: AdminDashboardMoney) => points(money.composition);

// ── Calls ──────────────────────────────────────────────────────────────────

export function toCallKpis(data: AdminDashboard, range: DashboardRange): HawkKpi[] {
  const c = data.calls;
  const period = RANGE_SPECS[range].comparison;
  const answerDelta =
    c.answer_rate_delta === null
      ? undefined
      : // Percentage POINTS, not a percentage change — labelled so nobody
        // reads "-2.6" as a relative fall.
        ({ percent: c.answer_rate_delta, period: 'pts' } satisfies HawkStatDelta);

  return [
    {
      key: 'live_now',
      label: 'Live now',
      value: c.live_now.toLocaleString(),
      icon: IconPhone,
      semantic: c.live_now > 0 ? 'success' : 'neutral',
    },
    {
      key: 'answer_rate',
      label: 'Answer rate',
      value: c.answer_rate === null ? '—' : `${c.answer_rate.toFixed(1)}%`,
      icon: IconTrendingUp,
      ...(answerDelta ? { delta: answerDelta } : {}),
      semantic: c.answer_rate !== null && c.answer_rate < 80 ? 'caution' : 'success',
    },
    {
      key: 'median_duration',
      label: 'Median duration',
      value: formatDuration(c.median_connected_seconds),
      icon: IconClock,
    },
    {
      key: 'ring_latency',
      label: 'Ring to answer',
      value: `${Math.round(c.median_ring_seconds)}s`,
      icon: IconBell,
      ...(delta(null, period) ? {} : {}),
    },
  ];
}

export function toCallQualityKpis(data: AdminDashboard): HawkKpi[] {
  const q = data.calls.quality;
  return [
    {
      key: 'permission',
      label: 'Permission blocked',
      value: q.permission_blocked.toLocaleString(),
      icon: IconMicOff,
      semantic: q.permission_blocked > 0 ? 'critical' : 'neutral',
    },
    {
      key: 'no_end',
      label: 'Ended without signal',
      value: q.ended_without_signal.toLocaleString(),
      icon: IconWifiOff,
      semantic: q.ended_without_signal > 0 ? 'caution' : 'neutral',
    },
    {
      key: 'token',
      label: 'Token renewals',
      value: q.token_renewals.toLocaleString(),
      icon: IconRefresh,
    },
    {
      key: 'backgrounded',
      label: 'Backgrounded',
      value: q.backgrounded.toLocaleString(),
      icon: IconPause,
    },
  ];
}

export const toCallOutcomes = (data: AdminDashboard) => points(data.calls.outcomes);
export const toEndReasons = (data: AdminDashboard) => points(data.calls.end_reasons);

/**
 * The scheduled-call funnel.
 *
 * Labelled for what the live `call_status` enum actually measures — attendance,
 * not payment. A call row only exists once payment settled, so there is no
 * unpaid stage to drop out of.
 */
export const toFunnel = (data: AdminDashboard): HawkChartPoint[] => {
  const f = data.calls.funnel;
  return [
    { label: 'Scheduled', value: f.booked },
    { label: 'Reached start', value: f.paid },
    { label: 'Both joined', value: f.started },
    { label: 'Completed', value: f.completed },
  ];
};

// ── Growth ─────────────────────────────────────────────────────────────────

export const toSignupsClients = (data: AdminDashboard, granularity: string) =>
  series(data.growth.signups_clients, granularity);

export const toSignupsProfessionals = (data: AdminDashboard, granularity: string) =>
  series(data.growth.signups_professionals, granularity);

export function toActivationKpis(data: AdminDashboard, range: DashboardRange): HawkKpi[] {
  const a = data.growth.activation;
  const period = RANGE_SPECS[range].comparison;
  return [
    {
      key: 'registered',
      label: 'Registered',
      value: a.registered.toLocaleString(),
      icon: IconUsers,
      ...(delta(a.registered_delta, period) ? { delta: delta(a.registered_delta, period)! } : {}),
    },
    {
      key: 'verified',
      label: 'Fully verified',
      value: a.phone_verified.toLocaleString(),
      icon: IconVerified,
      ...(delta(a.phone_verified_delta, period)
        ? { delta: delta(a.phone_verified_delta, period)! }
        : {}),
      semantic: 'success',
    },
    {
      key: 'kyc_approved',
      label: 'KYC approved',
      value: a.kyc_approved.toLocaleString(),
      icon: IconIdCard,
      ...(delta(a.kyc_approved_delta, period)
        ? { delta: delta(a.kyc_approved_delta, period)! }
        : {}),
    },
    {
      key: 'first_call',
      label: 'Took a first call',
      value: a.first_call.toLocaleString(),
      icon: IconPhone,
      ...(delta(a.first_call_delta, period) ? { delta: delta(a.first_call_delta, period)! } : {}),
      semantic: 'caution',
    },
  ];
}

/** The per-stage funnel, with each stage's share of registrations. */
export function toActivationFunnel(data: AdminDashboard): HawkStep[] {
  const a = data.growth.activation;
  const share = (value: number): string =>
    a.registered === 0
      ? '—'
      : `${value.toLocaleString()} · ${Math.round((value / a.registered) * 100)}%`;

  return [
    { label: 'Registered', timestamp: a.registered.toLocaleString() },
    {
      label: 'Email verified',
      timestamp: share(a.email_verified),
      description: `${(a.registered - a.email_verified).toLocaleString()} dropped`,
    },
    {
      label: 'Phone verified',
      timestamp: share(a.phone_verified),
      description: `${(a.email_verified - a.phone_verified).toLocaleString()} dropped`,
    },
    {
      label: 'KYC submitted',
      timestamp: share(a.kyc_submitted),
      description: 'professionals only',
    },
    {
      label: 'KYC approved',
      timestamp: share(a.kyc_approved),
      description: `${(a.kyc_submitted - a.kyc_approved).toLocaleString()} awaiting or rejected`,
    },
    {
      label: 'First call',
      timestamp: share(a.first_call),
      description: `${Math.max(0, a.kyc_approved - a.first_call).toLocaleString()} approved but never called`,
    },
  ];
}

// ── Platform ───────────────────────────────────────────────────────────────

export const toPlatformSplit = (data: AdminDashboard) => points(data.platform.split);
export const toOsSpread = (data: AdminDashboard) => points(data.platform.os_spread);
export const toTopDevices = (data: AdminDashboard) =>
  data.platform.top_devices.map((point) => ({ label: point.label, value: point.value }));

export interface VersionAdoption {
  version: string;
  platform: string;
  sessions: number;
  belowMinimum: boolean;
}

/**
 * Version adoption with each row's gate verdict resolved.
 *
 * Compared per platform: iOS and Android carry independent minimums, and a
 * single global comparison would mark an up-to-date Android build as stranded
 * because iOS had moved on.
 */
export function toVersionAdoption(data: AdminDashboard): VersionAdoption[] {
  const gates = new Map(data.platform.gates.map((gate) => [gate.platform, gate.min_version]));
  return data.platform.versions.map((row) => {
    const minimum = gates.get(row.platform);
    return {
      version: row.version,
      platform: row.platform,
      sessions: row.sessions,
      belowMinimum:
        minimum !== undefined &&
        row.version !== 'unknown' &&
        compareVersions(row.version, minimum) < 0,
    };
  });
}

/** Numeric per-segment comparison — `1.10.0` is above `1.9.0`, not below it. */
function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (Number.isNaN(l) || Number.isNaN(r)) return 0;
    if (l !== r) return l - r;
  }
  return 0;
}

// ── Trust ──────────────────────────────────────────────────────────────────

export const toReportReasons = (data: AdminDashboard) => points(data.trust.report_reasons);
export const toActionsByAdmin = (data: AdminDashboard) =>
  data.trust.actions_by_admin.map((point) => ({ label: point.label, value: point.value }));

export { IconAlertTriangle };
