import type { CallSessionEventRow } from './call-session-events.types.js';

// Event names emitted by the call-app bridge that bear on billable duration.
// Mirrors CA_EVENTS in apps/call-app/src/shared/bridge/bridge.types.ts — the
// wire contract between the two. Adding one here without the call-app emitting
// it is a no-op; the reverse silently under-bills.
export const DurationEvent = {
  ACTIVE: 'ca:active',
  ENDED: 'ca:ended',
  PAUSED: 'ca:duration-paused',
  RESUMED: 'ca:duration-resumed',
} as const;

export type DurationEvent = (typeof DurationEvent)[keyof typeof DurationEvent];

export const DurationSource = {
  /** Summed from the call-app's own event log — the authoritative path. */
  EVENT_LOG: 'event_log',
  /** Event log unusable; fell back to server wall-clock. Indicates a broken pipeline. */
  WALL_CLOCK: 'wall_clock',
  /** Neither available — the call never connected. */
  NONE: 'none',
} as const;

export type DurationSource = (typeof DurationSource)[keyof typeof DurationSource];

export interface DerivedDuration {
  billableSeconds: number;
  source: DurationSource;
}

interface WallClockFallback {
  connectedAt: Date | null;
  endedAt: Date;
}

/**
 * Sums the intervals during which the call was genuinely connected and metering.
 *
 * A call may go active, pause (client ran out of minutes and is topping up),
 * resume, and end — possibly several times over. Naively subtracting the first
 * `ca:active` from the last `ca:ended` bills the paused windows, which the
 * caller was never charged for and the professional never worked through.
 *
 * The walk is deliberately tolerant of a malformed stream: a trailing `ca:active`
 * with no matching close is settled against the last event we saw, and repeated
 * pauses or resumes collapse rather than throwing. A caller whose app crashes
 * mid-call still produces a billable number.
 */
const sumMeteredIntervals = (events: readonly CallSessionEventRow[]): number | null => {
  let openedAt: Date | null = null;
  let totalMs = 0;
  let sawActive = false;

  for (const event of events) {
    switch (event.event) {
      case DurationEvent.ACTIVE:
      case DurationEvent.RESUMED:
        sawActive ||= event.event === DurationEvent.ACTIVE;
        openedAt ??= event.occurred_at;
        break;

      case DurationEvent.PAUSED:
      case DurationEvent.ENDED:
        if (openedAt) {
          totalMs += event.occurred_at.getTime() - openedAt.getTime();
          openedAt = null;
        }
        break;
    }
  }

  if (!sawActive) return null;

  // Stream ended while still metering (no `ca:ended` arrived — app killed,
  // network died). Close the interval at the last thing we heard.
  if (openedAt) {
    const last = events[events.length - 1];
    if (last) totalMs += last.occurred_at.getTime() - openedAt.getTime();
  }

  return Math.max(0, Math.floor(totalMs / 1000));
};

/**
 * Resolves how many seconds a call is billed for.
 *
 * The client reports its own duration when hanging up, but that number funds a
 * real ledger posting — a caller who reports zero would talk for free and leave
 * the professional unpaid. So the event log wins, and the client's figure is
 * kept only to reconcile against.
 *
 * When the log is unusable we fall back to server wall-clock — the span the
 * server itself observed between `connected_at` and the hangup.
 *
 * **The client's figure is deliberately NOT a cap.** It used to be, on the
 * reasoning that a stalled `ended` event should not inflate the charge. In
 * practice it did the opposite: the mobile ticker excludes time spent
 * reconnecting, so a 119-second video call with two brief drops reported 63
 * seconds and the professional was paid for 63 — the peer's bad network came
 * out of their earnings. Worse, a call whose ticker never started reported
 * zero and paid nothing for real talk time.
 *
 * Wall-clock is bounded already: `seconds_allotted` caps it at settlement, and
 * the caller cannot be charged past the escrow they prepaid. Those are real
 * limits. A number the client picks is not one — especially when the client
 * has an incentive to under-report and the professional has no say in it.
 */
export const deriveBillableSeconds = (
  events: readonly CallSessionEventRow[],
  clientReportedSeconds: number,
  fallback: WallClockFallback,
): DerivedDuration => {
  const metered = sumMeteredIntervals(events);
  if (metered !== null) {
    return { billableSeconds: metered, source: DurationSource.EVENT_LOG };
  }

  if (!fallback.connectedAt) {
    return { billableSeconds: 0, source: DurationSource.NONE };
  }

  const wallClockSeconds = Math.max(
    0,
    Math.floor((fallback.endedAt.getTime() - fallback.connectedAt.getTime()) / 1000),
  );
  return {
    billableSeconds: wallClockSeconds,
    source: DurationSource.WALL_CLOCK,
  };
};
