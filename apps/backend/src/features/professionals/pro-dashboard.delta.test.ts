import { describe, expect, it, vi } from 'vitest';

// The delta is the one number on this dashboard that is *derived* rather than
// read, which makes it the one that can lie. Every case below is a way of
// lying that the shape is designed to prevent.
vi.mock('@features/auth/auth.repo.js', () => ({ findUserById: vi.fn() }));
vi.mock('@features/wallet/wallet.repo.js', () => ({ listUserTransactions: vi.fn() }));
vi.mock('@lib/cache/responseCache.js', () => ({
  getOrCompute: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock('./pro-dashboard.repo.js', () => ({
  readEarnings: vi.fn(),
  readAttention: vi.fn(),
  readRecentCalls: vi.fn(),
}));

const { computeDeltaForTest } = await import('./pro-dashboard.service.js');

const DAY = 24 * 60 * 60 * 1000;

describe('earnings delta', () => {
  const windowStart = new Date('2026-08-23T00:00:00Z');
  const longAgo = new Date('2026-01-01T00:00:00Z');

  it('reports a rise as a signed percentage', () => {
    const delta = computeDeltaForTest(150_00n, 100_00n, windowStart, longAgo, 'first day');

    expect(delta).toEqual({ percent: 50, label: null });
  });

  it('reports a fall as a negative percentage', () => {
    const delta = computeDeltaForTest(50_00n, 100_00n, windowStart, longAgo, 'first day');

    expect(delta).toEqual({ percent: -50, label: null });
  });

  it('rounds to one decimal place', () => {
    // 12.4%, not 12.399999999999999 — the client renders this verbatim.
    const delta = computeDeltaForTest(11_240n, 10_000n, windowStart, longAgo, 'first day');

    expect(delta.percent).toBe(12.4);
  });

  it('never invents a percentage from a zero baseline', () => {
    // Any rise from ₦0 is an infinite one. "+∞%" tells the reader nothing, and
    // clamping it to some large number is a fabrication.
    const delta = computeDeltaForTest(100_00n, 0n, windowStart, longAgo, 'first day');

    expect(delta.percent).toBeNull();
    expect(delta.label).toBe('first earnings');
  });

  it('says so when a professional has never earned', () => {
    const delta = computeDeltaForTest(0n, 0n, windowStart, null, 'first day');

    expect(delta.percent).toBeNull();
    expect(delta.label).toBe('no earnings yet');
  });

  it('gives a first-period professional words, not a fake gain', () => {
    // Someone whose first credit landed inside the current window has no
    // previous window. Without this guard their first day always reads as a
    // 100% rise over a period they were not trading in.
    const startedToday = new Date(windowStart.getTime() + 60_000);
    const delta = computeDeltaForTest(500_00n, 0n, windowStart, startedToday, 'first day');

    expect(delta.percent).toBeNull();
    expect(delta.label).toBe('first day');
  });

  it('uses the caller-supplied label for each window', () => {
    const startedThisWeek = new Date(windowStart.getTime() + DAY);
    const delta = computeDeltaForTest(
      500_00n,
      0n,
      windowStart,
      startedThisWeek,
      'first week',
    );

    expect(delta.label).toBe('first week');
  });

  it('distinguishes a flat zero from a first period', () => {
    // Earning nothing this period AND nothing last period is a real, reportable
    // "no change" — not the same statement as "you have no baseline".
    const delta = computeDeltaForTest(0n, 0n, windowStart, longAgo, 'first day');

    expect(delta.percent).toBeNull();
    expect(delta.label).toBe('no change');
  });

  it('reports a genuine flat period as 0%, not as a missing comparison', () => {
    const delta = computeDeltaForTest(100_00n, 100_00n, windowStart, longAgo, 'first day');

    expect(delta).toEqual({ percent: 0, label: null });
  });

  it('never returns both a percent and a label', () => {
    // The client branches on `percent === null`. A row carrying both would make
    // that branch ambiguous.
    const cases = [
      computeDeltaForTest(150_00n, 100_00n, windowStart, longAgo, 'first day'),
      computeDeltaForTest(100_00n, 0n, windowStart, longAgo, 'first day'),
      computeDeltaForTest(0n, 0n, windowStart, null, 'first day'),
    ];

    for (const delta of cases) {
      expect(delta.percent === null || delta.label === null).toBe(true);
    }
  });
});
