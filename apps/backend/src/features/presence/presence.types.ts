export interface PresenceView {
  user_id: string;
  /** Heartbeated within the online window. */
  online: boolean;
  /** The pro's manual "accepting calls" switch (users.is_available). */
  accepting_calls: boolean;
  /** Currently inside a do-not-disturb block. */
  dnd: boolean;
  /** online && accepting_calls && !dnd — the pro can take a call right now. */
  reachable: boolean;
  last_seen_at: string | null;
}

// Reason a call preflight fails, in check order. `ok` means reachable.
export const ReachabilityReason = {
  OK: 'ok',
  OFFLINE: 'offline',
  NOT_ACCEPTING: 'not_accepting',
  DND: 'dnd',
} as const;

export type ReachabilityReason = (typeof ReachabilityReason)[keyof typeof ReachabilityReason];
