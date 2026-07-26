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
