import type { HawkSemantic } from '../theme/semantic.js';

/**
 * One named lifecycle state: what the database calls it, what the user reads,
 * and how worried to be.
 */
export interface HawkStatus {
  /**
   * The backend's own value — `late_cancellation`, `awaiting_payment`. Kept so
   * a caller maps API → UI in one lookup rather than a switch per screen.
   */
  readonly key: string;
  /** What the user reads. Sentence case, never SCREAMING_SNAKE. */
  readonly label: string;
  readonly semantic: HawkSemantic;
}

/**
 * The product's lifecycle vocabulary — every named state, with its tone.
 *
 * The database defines 63+ named states across 32 enums; the pre-Hawk app
 * shipped four status-pill files and flattened all of them into
 * success/warning/error. **Every one of these gets a real name and a real
 * colour**, and the mapping lives here rather than in each screen so two
 * surfaces can never disagree about what "pending" looks like.
 *
 * Transcribed from the design system's own status specimens (`70-`–`75-`) and
 * kept identical to the Flutter port at
 * `mobile/lib/ui/hawk/status/hawk_lifecycle.dart`. Some tones are deliberately
 * counter-intuitive and are worth preserving:
 *
 * - A **completed** call is `neutral`, not `success` — finishing a call is the
 *   normal case, and a green badge on every row makes the exceptional ones
 *   invisible.
 * - An **active** strike is `critical` while a **resolved** one is `success`:
 *   the tone tracks the user's exposure, not the record's freshness.
 * - **Refunded** is `info`, not `success` — money coming back is usually the
 *   end of something that went wrong.
 */

/** Call lifecycle. */
export const HAWK_CALL: readonly HawkStatus[] = [
  { key: "scheduled", label: "Scheduled", semantic: "info" },
  { key: "awaiting_payment", label: "Awaiting payment", semantic: "caution" },
  { key: "in_progress", label: "In progress", semantic: "info" },
  { key: "completed", label: "Completed", semantic: "neutral" },
  { key: "missed", label: "Missed", semantic: "caution" },
  { key: "cancelled", label: "Cancelled", semantic: "neutral" },
];

/** Booking lifecycle. */
export const HAWK_BOOKING: readonly HawkStatus[] = [
  { key: "pending", label: "Pending", semantic: "caution" },
  { key: "confirmed", label: "Confirmed", semantic: "info" },
  { key: "fulfilled", label: "Fulfilled", semantic: "success" },
  { key: "cancelled", label: "Cancelled", semantic: "neutral" },
  { key: "late_cancellation", label: "Late cancellation", semantic: "critical" },
];

/** KYC verification. */
export const HAWK_KYC: readonly HawkStatus[] = [
  { key: "not_started", label: "Not started", semantic: "neutral" },
  { key: "under_review", label: "Under review", semantic: "caution" },
  { key: "verified", label: "Verified", semantic: "success" },
  { key: "action_needed", label: "Action needed", semantic: "critical" },
];

/** Identity document types. Info rather than neutral: they are a *kind*, not a state, and info reads as classification rather than judgement. */
export const HAWK_IDENTITY: readonly HawkStatus[] = [
  { key: "nin", label: "NIN", semantic: "info" },
  { key: "bvn", label: "BVN", semantic: "info" },
  { key: "passport", label: "Passport", semantic: "info" },
  { key: "drivers_licence", label: "Driver's licence", semantic: "info" },
];

/** Payment. */
export const HAWK_PAYMENT: readonly HawkStatus[] = [
  { key: "pending", label: "Pending", semantic: "caution" },
  { key: "paid", label: "Paid", semantic: "success" },
  { key: "failed", label: "Failed", semantic: "critical" },
  { key: "reversed", label: "Reversed", semantic: "critical" },
];

/** Ledger transaction. */
export const HAWK_TRANSACTION: readonly HawkStatus[] = [
  { key: "pending", label: "Pending", semantic: "caution" },
  { key: "completed", label: "Completed", semantic: "success" },
  { key: "failed", label: "Failed", semantic: "critical" },
  { key: "reversed", label: "Reversed", semantic: "critical" },
];

/** Withdrawal. */
export const HAWK_WITHDRAWAL: readonly HawkStatus[] = [
  { key: "pending", label: "Pending", semantic: "caution" },
  { key: "approved", label: "Approved", semantic: "success" },
  { key: "auto_approved", label: "Auto-approved", semantic: "success" },
  { key: "successful", label: "Successful", semantic: "success" },
  { key: "rejected", label: "Rejected", semantic: "critical" },
  { key: "failed", label: "Failed", semantic: "critical" },
];

/** Refund. */
export const HAWK_REFUND: readonly HawkStatus[] = [
  { key: "pending", label: "Pending", semantic: "caution" },
  { key: "refunded", label: "Refunded", semantic: "info" },
  { key: "partly_refunded", label: "Partly refunded", semantic: "info" },
  { key: "rejected", label: "Rejected", semantic: "critical" },
];

/** Strike against a professional. */
export const HAWK_STRIKE: readonly HawkStatus[] = [
  { key: "active", label: "Active", semantic: "critical" },
  { key: "disputed", label: "Disputed", semantic: "caution" },
  { key: "upheld", label: "Upheld", semantic: "critical" },
  { key: "voided", label: "Voided", semantic: "neutral" },
];

/** Why a strike was issued. */
export const HAWK_STRIKE_REASON: readonly HawkStatus[] = [
  { key: "no_show", label: "No show", semantic: "critical" },
  { key: "late_cancellation", label: "Late cancellation", semantic: "caution" },
  { key: "left_mid_call", label: "Left mid-call", semantic: "critical" },
];

/** User report / moderation. */
export const HAWK_REPORT: readonly HawkStatus[] = [
  { key: "pending", label: "Pending", semantic: "caution" },
  { key: "resolved", label: "Resolved", semantic: "success" },
  { key: "dismissed", label: "Dismissed", semantic: "neutral" },
];

/** Account status. */
export const HAWK_USER: readonly HawkStatus[] = [
  { key: "active", label: "Active", semantic: "success" },
  { key: "suspended", label: "Suspended", semantic: "caution" },
  { key: "blocked", label: "Blocked", semantic: "critical" },
  { key: "deleted", label: "Deleted", semantic: "neutral" },
];

/** Campaign send. */
export const HAWK_CAMPAIGN: readonly HawkStatus[] = [
  { key: "draft", label: "Draft", semantic: "neutral" },
  { key: "scheduled", label: "Scheduled", semantic: "info" },
  { key: "sent", label: "Sent", semantic: "success" },
  { key: "cancelled", label: "Cancelled", semantic: "neutral" },
  { key: "failed", label: "Failed", semantic: "critical" },
];

/** Notification kinds. */
export const HAWK_NOTIFICATION: readonly HawkStatus[] = [
  { key: "missed_call", label: "Missed call", semantic: "caution" },
  { key: "upcoming_call", label: "Upcoming call", semantic: "info" },
  { key: "payment_received", label: "Payment received", semantic: "success" },
  { key: "call_scheduled", label: "Call scheduled", semantic: "info" },
  { key: "call_cancelled", label: "Call cancelled", semantic: "caution" },
  { key: "call_moved", label: "Call moved", semantic: "info" },
  { key: "new_review", label: "New review", semantic: "info" },
  { key: "withdrawal_processed", label: "Withdrawal processed", semantic: "success" },
  { key: "system", label: "System", semantic: "neutral" },
];

/** Purchase intent. */
export const HAWK_INTENT: readonly HawkStatus[] = [
  { key: "in_progress", label: "In progress", semantic: "info" },
  { key: "satisfied", label: "Satisfied", semantic: "success" },
  { key: "already_satisfied", label: "Already satisfied", semantic: "success" },
  { key: "expired", label: "Expired", semantic: "neutral" },
  { key: "cancelled", label: "Cancelled", semantic: "neutral" },
];

/** Professional presence. */
export const HAWK_PRESENCE: readonly HawkStatus[] = [
  { key: "online", label: "Online", semantic: "success" },
  { key: "busy", label: "On a call", semantic: "caution" },
  { key: "away", label: "Away", semantic: "neutral" },
  { key: "offline", label: "Offline", semantic: "neutral" },
];

/** Every family, keyed by name — what the gallery enumerates. */
export const HAWK_LIFECYCLE = {
  call: HAWK_CALL,
  booking: HAWK_BOOKING,
  kyc: HAWK_KYC,
  identity: HAWK_IDENTITY,
  payment: HAWK_PAYMENT,
  transaction: HAWK_TRANSACTION,
  withdrawal: HAWK_WITHDRAWAL,
  refund: HAWK_REFUND,
  strike: HAWK_STRIKE,
  strikeReason: HAWK_STRIKE_REASON,
  report: HAWK_REPORT,
  user: HAWK_USER,
  campaign: HAWK_CAMPAIGN,
  notification: HAWK_NOTIFICATION,
  intent: HAWK_INTENT,
  presence: HAWK_PRESENCE,
} as const;

export type HawkLifecycleFamily = keyof typeof HAWK_LIFECYCLE;

export const HAWK_LIFECYCLE_FAMILIES = Object.keys(
  HAWK_LIFECYCLE,
) as readonly HawkLifecycleFamily[];

/**
 * Look a status up by its backend key.
 *
 * Returns `undefined` rather than throwing or inventing a fallback: a key the
 * registry does not know is a real signal that the backend gained a state the
 * UI has not been taught, and swallowing it into a grey "Unknown" pill is how
 * that goes unnoticed for a release. Callers render their own fallback and can
 * choose to report it.
 */
export function lookupStatus(
  family: HawkLifecycleFamily,
  key: string,
): HawkStatus | undefined {
  return HAWK_LIFECYCLE[family].find((status) => status.key === key);
}

/** Total named states across every family. */
export const HAWK_LIFECYCLE_COUNT = HAWK_LIFECYCLE_FAMILIES.reduce(
  (total, family) => total + HAWK_LIFECYCLE[family].length,
  0,
);
