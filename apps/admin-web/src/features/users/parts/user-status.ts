import { HawkSemantic, type HawkStatus } from '@ohlify/hawk-ui';

/**
 * Backend status values → Hawk badge descriptors.
 *
 * Hawk's lifecycle registry names states in user language (`verified`,
 * `action_needed`) while the database names them in system language
 * (`approved`, `rejected`). Neither is wrong — the designer wrote for the
 * person reading a screen, the schema for the person writing a query — but
 * `lookupStatus('kyc', 'approved')` returns undefined, so a mapping has to
 * exist somewhere.
 *
 * It lives here, once, rather than as a ternary at each of the nineteen call
 * sites that need it.
 */

const status = (label: string, semantic: HawkSemantic): HawkStatus => ({
  key: label.toLowerCase().replace(/\s+/g, '_'),
  label,
  semantic,
});

const USER_STATUS: Record<string, HawkStatus> = {
  active: status('Active', HawkSemantic.SUCCESS),
  suspended: status('Suspended', HawkSemantic.CAUTION),
  blocked: status('Blocked', HawkSemantic.CRITICAL),
  deleted: status('Deleted', HawkSemantic.NEUTRAL),
};

const KYC_STATUS: Record<string, HawkStatus> = {
  none: status('Not started', HawkSemantic.NEUTRAL),
  pending_review: status('Under review', HawkSemantic.CAUTION),
  approved: status('Verified', HawkSemantic.SUCCESS),
  rejected: status('Action needed', HawkSemantic.CRITICAL),
};

const CALL_STATUS: Record<string, HawkStatus> = {
  ended: status('Completed', HawkSemantic.SUCCESS),
  completed: status('Completed', HawkSemantic.SUCCESS),
  missed: status('Missed', HawkSemantic.CAUTION),
  cancelled: status('Cancelled', HawkSemantic.NEUTRAL),
  active: status('Live', HawkSemantic.SUCCESS),
  ringing: status('Ringing', HawkSemantic.INFO),
};

const WITHDRAWAL_STATUS: Record<string, HawkStatus> = {
  pending: status('Pending', HawkSemantic.CAUTION),
  processing: status('Processing', HawkSemantic.INFO),
  completed: status('Paid', HawkSemantic.SUCCESS),
  failed: status('Failed', HawkSemantic.CRITICAL),
  reversed: status('Reversed', HawkSemantic.CRITICAL),
};

const STRIKE_STATUS: Record<string, HawkStatus> = {
  active: status('Active', HawkSemantic.CRITICAL),
  disputed: status('Disputed', HawkSemantic.CAUTION),
  expired: status('Expired', HawkSemantic.NEUTRAL),
  revoked: status('Revoked', HawkSemantic.NEUTRAL),
};

const REPORT_STATUS: Record<string, HawkStatus> = {
  pending: status('Pending', HawkSemantic.CAUTION),
  resolved: status('Resolved', HawkSemantic.SUCCESS),
  dismissed: status('Dismissed', HawkSemantic.NEUTRAL),
};

const REGISTRIES = {
  user: USER_STATUS,
  kyc: KYC_STATUS,
  call: CALL_STATUS,
  withdrawal: WITHDRAWAL_STATUS,
  strike: STRIKE_STATUS,
  report: REPORT_STATUS,
} as const;

export type StatusFamily = keyof typeof REGISTRIES;

/**
 * Resolves a backend status into a badge descriptor.
 *
 * Falls back to a humanised neutral badge rather than throwing or rendering
 * nothing: a status the client has not seen before is a deploy-order problem,
 * and an unlabelled row is worse than an uncoloured one.
 */
export function statusFor(family: StatusFamily, key: string | null | undefined): HawkStatus {
  if (!key) return status('—', HawkSemantic.NEUTRAL);
  const found = REGISTRIES[family][key];
  if (found) return found;
  const humanised = key.replace(/[_-]+/g, ' ');
  return status(humanised.charAt(0).toUpperCase() + humanised.slice(1), HawkSemantic.NEUTRAL);
}

/** Relative age from an ISO timestamp — "3d ago", "just now". */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
  const days = Math.round(seconds / 86_400);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.round(months / 12)}y ago`;
}

/** Absolute timestamp, UTC — the record face reads this. */
export function absoluteTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Masks all but the last four digits of an account number. */
export function maskAccount(value: string): string {
  if (value.length <= 4) return value;
  return `${'•'.repeat(value.length - 4)}${value.slice(-4)}`;
}
