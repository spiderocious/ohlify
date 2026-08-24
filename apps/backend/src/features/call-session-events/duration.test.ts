import { describe, expect, it } from 'vitest';

import type { CallSessionEventRow } from './call-session-events.types.js';
import { deriveBillableSeconds, DurationEvent, DurationSource } from './duration.js';

const at = (isoSeconds: number): Date => new Date(Date.UTC(2026, 7, 24, 8, 0, isoSeconds));

const ev = (event: string, seconds: number): CallSessionEventRow =>
  ({
    id: `e_${event}_${seconds}`,
    call_id: 'ic_test',
    call_reference: null,
    event,
    payload: {},
    occurred_at: at(seconds),
    created_at: at(seconds),
  }) as CallSessionEventRow;

describe('deriveBillableSeconds', () => {
  describe('the event log — the authoritative path', () => {
    it('bills the span between active and ended', () => {
      const d = deriveBillableSeconds(
        [ev(DurationEvent.ACTIVE, 0), ev(DurationEvent.ENDED, 90)],
        90,
        { connectedAt: at(0), endedAt: at(90) },
      );

      expect(d).toEqual({ billableSeconds: 90, source: DurationSource.EVENT_LOG });
    });

    it('excludes a paused window — the caller was topping up, not talking', () => {
      const d = deriveBillableSeconds(
        [
          ev(DurationEvent.ACTIVE, 0),
          ev(DurationEvent.PAUSED, 30),
          ev(DurationEvent.RESUMED, 90),
          ev(DurationEvent.ENDED, 120),
        ],
        120,
        { connectedAt: at(0), endedAt: at(120) },
      );

      // 30 talked + 30 talked; the 60s spent staring at the top-up sheet is
      // neither charged to the caller nor paid to the professional.
      expect(d.billableSeconds).toBe(60);
      expect(d.source).toBe(DurationSource.EVENT_LOG);
    });

    it('collapses repeated actives rather than opening a second interval', () => {
      // A reconnect settles back into the active phase and re-reports it.
      const d = deriveBillableSeconds(
        [
          ev(DurationEvent.ACTIVE, 0),
          ev(DurationEvent.ACTIVE, 10),
          ev(DurationEvent.ACTIVE, 20),
          ev(DurationEvent.ENDED, 60),
        ],
        60,
        { connectedAt: at(0), endedAt: at(60) },
      );

      expect(d.billableSeconds).toBe(60);
    });

    it('closes an unterminated stream at the last event it saw', () => {
      // The app was killed mid-call: no `ca:ended` ever arrived.
      const d = deriveBillableSeconds([ev(DurationEvent.ACTIVE, 0), ev('ca:heartbeat', 45)], 0, {
        connectedAt: at(0),
        endedAt: at(300),
      });

      expect(d.billableSeconds).toBe(45);
      expect(d.source).toBe(DurationSource.EVENT_LOG);
    });

    it('ignores a log that never went active', () => {
      const d = deriveBillableSeconds([ev(DurationEvent.ENDED, 30)], 30, {
        connectedAt: at(0),
        endedAt: at(30),
      });

      // Falls through to wall-clock rather than billing zero off a stray
      // close event.
      expect(d.source).toBe(DurationSource.WALL_CLOCK);
    });
  });

  describe('the wall-clock fallback', () => {
    it('bills what the server observed, NOT what the client claimed', () => {
      // The regression this pins. A 119s video call with two brief reconnects
      // reported 63s, because the mobile ticker excludes reconnecting time.
      // Capping by that figure paid the professional for 63s and charged the
      // caller for 63s — the peer's bad network came out of their earnings.
      const d = deriveBillableSeconds([], 63, {
        connectedAt: at(0),
        endedAt: at(119),
      });

      expect(d.billableSeconds).toBe(119);
      expect(d.source).toBe(DurationSource.WALL_CLOCK);
    });

    it('bills a real call whose client reported zero', () => {
      // The "you earned nothing" report: 10 seconds of real talk, a ticker
      // that never started, and a professional paid nothing for it.
      const d = deriveBillableSeconds([], 0, {
        connectedAt: at(0),
        endedAt: at(10),
      });

      expect(d.billableSeconds).toBe(10);
    });

    it('does not let a client inflate the charge either', () => {
      // The cap is gone in both directions: wall-clock is the answer, so an
      // over-reporting client changes nothing.
      const d = deriveBillableSeconds([], 9999, {
        connectedAt: at(0),
        endedAt: at(30),
      });

      expect(d.billableSeconds).toBe(30);
    });

    it('never goes negative on a clock that ran backwards', () => {
      const d = deriveBillableSeconds([], 0, {
        connectedAt: at(60),
        endedAt: at(0),
      });

      expect(d.billableSeconds).toBe(0);
    });
  });

  describe('never connected', () => {
    it('bills nothing when the call never went up', () => {
      const d = deriveBillableSeconds([], 42, { connectedAt: null, endedAt: at(42) });

      // A client claiming 42 seconds on a call the server never saw connect
      // must not produce a charge.
      expect(d).toEqual({ billableSeconds: 0, source: DurationSource.NONE });
    });
  });
});
