import { HawkSemantic, type HawkStatus } from '@ohlify/hawk-ui';

/**
 * Backend status values → Hawk badge descriptors, for every family the admin
 * console renders.
 *
 * Hawk's own lifecycle registry names states in user language (`verified`,
 * `action_needed`) while the schema names them in system language (`approved`,
 * `rejected`). Neither is wrong — the designer wrote for the person reading a
 * screen, the schema for the person writing a query — but that means
 * `lookupStatus('kyc', 'approved')` returns undefined, so a mapping has to
 * exist somewhere.
 *
 * It exists here, once, rather than as a ternary at each of the sixty-odd call
 * sites across the console. Adding a status to the backend is then a one-line
 * change here rather than a hunt.
 */

const s = (label: string, semantic: HawkSemantic): HawkStatus => ({
  key: label.toLowerCase().replace(/\s+/g, '_'),
  label,
  semantic,
});

const { SUCCESS, CAUTION, CRITICAL, NEUTRAL, INFO } = HawkSemantic;

const REGISTRIES = {
  user: {
    active: s('Active', SUCCESS),
    suspended: s('Suspended', CAUTION),
    blocked: s('Blocked', CRITICAL),
    deleted: s('Deleted', NEUTRAL),
  },

  kyc: {
    none: s('Not started', NEUTRAL),
    pending_review: s('Under review', CAUTION),
    approved: s('Verified', SUCCESS),
    rejected: s('Action needed', CRITICAL),
  },

  /**
   * Scheduled calls. The enum splits its failures by side — a no-show by the
   * caller and one by the callee are different incidents with different
   * consequences, so they are not collapsed into one label.
   */
  call: {
    scheduled: s('Scheduled', INFO),
    waiting_for_parties: s('Waiting', CAUTION),
    in_progress: s('In progress', SUCCESS),
    completed: s('Completed', SUCCESS),
    no_show_caller: s('Caller no-show', CRITICAL),
    no_show_callee: s('Callee no-show', CRITICAL),
    no_show_both: s('Both no-show', CRITICAL),
    disconnected_caller: s('Caller dropped', CAUTION),
    disconnected_callee: s('Callee dropped', CAUTION),
  },

  /** Instant calls — a different enum from scheduled ones. */
  instantCall: {
    ringing: s('Ringing', INFO),
    active: s('Live', SUCCESS),
    ended: s('Completed', SUCCESS),
    missed: s('Missed', CAUTION),
    cancelled: s('Cancelled', NEUTRAL),
  },

  /**
   * Bookings carry their own four-value enum, distinct from `call_status`:
   * a booking is the commitment, a call is what happened to it.
   */
  booking: {
    pending: s('Awaiting payment', CAUTION),
    confirmed: s('Confirmed', INFO),
    completed: s('Completed', SUCCESS),
    cancelled: s('Cancelled', NEUTRAL),
  },

  withdrawal: {
    pending: s('Pending', CAUTION),
    processing: s('Processing', INFO),
    completed: s('Paid', SUCCESS),
    failed: s('Failed', CRITICAL),
    reversed: s('Reversed', CRITICAL),
  },

  refund: {
    pending: s('Pending', CAUTION),
    approved: s('Approved', SUCCESS),
    rejected: s('Rejected', NEUTRAL),
    processed: s('Processed', SUCCESS),
  },

  /**
   * Transactions span two sources with two vocabularies: payments use
   * `success`/`abandoned` (Paystack's words), journal entries use
   * `completed`. Both are listed rather than normalised — the board shows
   * whichever the row actually carries.
   */
  transaction: {
    pending: s('Pending', CAUTION),
    success: s('Success', SUCCESS),
    completed: s('Completed', SUCCESS),
    failed: s('Failed', CRITICAL),
    abandoned: s('Abandoned', NEUTRAL),
    reversed: s('Reversed', CRITICAL),
  },

  strike: {
    active: s('Active', CRITICAL),
    disputed: s('Disputed', CAUTION),
    expired: s('Expired', NEUTRAL),
    revoked: s('Revoked', NEUTRAL),
  },

  report: {
    pending: s('Pending', CAUTION),
    resolved: s('Resolved', SUCCESS),
    dismissed: s('Dismissed', NEUTRAL),
  },

  ticket: {
    open: s('Open', CAUTION),
    pending: s('Pending', CAUTION),
    resolved: s('Resolved', SUCCESS),
    closed: s('Closed', NEUTRAL),
  },

  campaign: {
    draft: s('Draft', NEUTRAL),
    scheduled: s('Scheduled', INFO),
    sending: s('Sending', INFO),
    sent: s('Sent', SUCCESS),
    cancelled: s('Cancelled', NEUTRAL),
    failed: s('Failed', CRITICAL),
  },

  /** Paystack webhook processing. */
  webhook: {
    processed: s('Processed', SUCCESS),
    unprocessed: s('Unprocessed', CAUTION),
    errored: s('Errored', CRITICAL),
  },

  /** Generic on/off — kill switches, publish state. */
  toggle: {
    true: s('On', SUCCESS),
    false: s('Off', NEUTRAL),
    published: s('Published', SUCCESS),
    draft: s('Draft', NEUTRAL),
    active: s('Active', SUCCESS),
    inactive: s('Inactive', NEUTRAL),
  },
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
  if (key === null || key === undefined || key === '') return s('—', NEUTRAL);
  const found = (REGISTRIES[family] as Record<string, HawkStatus | undefined>)[String(key)];
  if (found) return found;
  const humanised = String(key).replace(/[_-]+/g, ' ');
  return s(humanised.charAt(0).toUpperCase() + humanised.slice(1), NEUTRAL);
}

/** Tab options for a family, with an "All" leading entry. */
export function statusTabs<T extends StatusFamily>(
  family: T,
  options: { exclude?: readonly string[] } = {},
): Array<{ value: string; label: string }> {
  const exclude = new Set(options.exclude ?? []);
  return [
    { value: '', label: 'All' },
    ...Object.entries(REGISTRIES[family])
      .filter(([key]) => !exclude.has(key))
      .map(([key, status]) => ({ value: key, label: (status as HawkStatus).label })),
  ];
}
