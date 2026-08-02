export interface PresenceView {
  user_id: string;
  /**
   * Cosmetic "active now" signal — the pro has a live push token. It does NOT
   * gate calls: a phone rings from a push whether or not the app is open.
   */
  online: boolean;
  /** The pro's manual "accepting calls" switch (users.is_available). */
  accepting_calls: boolean;
  /** Currently inside a do-not-disturb block. */
  dnd: boolean;
  /** Reachable + accepting + not in DnD + not already on a call. */
  reachable: boolean;
  last_seen_at: string | null;
}

// Reason a call preflight fails, in check order. `ok` means reachable.
export const ReachabilityReason = {
  OK: 'ok',
  /** Not a live, approved professional at all. */
  OFFLINE: 'offline',
  /** No push token we could ring — the only true liveness gate. */
  UNREACHABLE: 'unreachable',
  /** Their availability switch is off. */
  NOT_ACCEPTING: 'not_accepting',
  /** Inside a do-not-disturb block. */
  DND: 'dnd',
  /** Already ringing or on a call. */
  BUSY: 'busy',
} as const;

export type ReachabilityReason = (typeof ReachabilityReason)[keyof typeof ReachabilityReason];

/**
 * Which preflight branch actually rejected the call.
 *
 * `ReachabilityReason` is what the caller BRANCHES on and what picks the
 * user-facing copy; several of its values cover more than one underlying cause,
 * so on its own it cannot say why a call was refused. `OFFLINE` in particular
 * merges three unrelated account states behind one message. These narrow the
 * outcome to a single `if`, and ride the envelope as `rejectionReason` for
 * support and dashboards.
 */
export const ReachabilityDetail = {
  /** No user row, or the account is not a professional. */
  NOT_PROFESSIONAL: 'not_professional',
  /** Suspended or blocked — `status !== 'active'`. */
  ACCOUNT_NOT_ACTIVE: 'account_not_active',
  /** Professional and active, but KYC has not been approved. */
  KYC_NOT_APPROVED: 'kyc_not_approved',
  /** Nothing FCM has touched inside the freshness window — no phone to ring. */
  NO_DEVICE_TOKEN: 'no_device_token',
  /** The pro's manual availability switch is off. */
  NOT_ACCEPTING: 'not_accepting',
  /** `now` falls inside one of their do-not-disturb blocks. */
  DND: 'dnd',
  /** Already ringing or talking on another call. */
  BUSY: 'busy',
} as const;

export type ReachabilityDetail = (typeof ReachabilityDetail)[keyof typeof ReachabilityDetail];
