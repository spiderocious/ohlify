import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminDashboard } from '@ohlify/api';

import { DashboardScreen } from '../screens/dashboard-screen.js';
import { formatAge, toAttentionSignals, toFunnel } from '../parts/dashboard-adapters.js';
import { DashboardRange, RANGE_SPECS } from '../parts/dashboard-range.js';

/**
 * The dashboard's behaviour against live-shaped data.
 *
 * Console errors fail these too: React reports key collisions and invalid DOM
 * nesting through `console.error` rather than by throwing, and this page
 * renders five sections of mapped lists — exactly where a duplicate key hides.
 */

const mockRole = vi.hoisted(() => ({ current: 'admin' as string }));
const mockQuery = vi.hoisted(() => ({
  current: {
    data: undefined as AdminDashboard | undefined,
    isLoading: false,
    isFetching: false,
    error: null as { errorMessage?: string } | null,
    refetch: () => undefined,
  },
}));

vi.mock('../../../shared/auth/use-current-admin.js', () => ({
  useCurrentAdmin: () => ({
    id: 'adm_1',
    email: 'ops@ohlify.test',
    full_name: 'Feranmi Adeniji',
    role: mockRole.current,
  }),
}));

vi.mock('../api/use-dashboard.js', () => ({
  useDashboard: () => mockQuery.current,
}));

/** A payload shaped exactly like a live response. */
function makeDashboard(overrides: Partial<AdminDashboard> = {}): AdminDashboard {
  return {
    range: '7d',
    granularity: 'day',
    window: { from: '2026-08-16T00:00:00.000Z', to: '2026-08-23T00:00:00.000Z' },
    attention: {
      uncredited_payments: { count: 2, oldest_seconds: 2520 },
      suspense: { count: 0, amount_kobo: 0 },
      withdrawals_stuck: { count: 0, oldest_seconds: null },
      kyc_pending: { count: 1, oldest_seconds: 1_886_935 },
      refunds_pending: { count: 0, oldest_seconds: null },
    },
    money: {
      net_revenue_kobo: 84_200_000,
      net_revenue_delta: 12.4,
      gross_volume_kobo: 412_800_000,
      gross_volume_delta: null,
      processor_fees_kobo: 9_640_000,
      processor_fees_delta: 6.4,
      escrow_kobo: 31_500_000,
      revenue_series: [{ bucket: '2026-08-16T00:00:00.000Z', value: 9_800_000 }],
      composition: [{ label: 'call_settlement', value: 61_400_000 }],
      ledger: { balanced: true, drift_accounts: 0, difference_kobo: 0 },
    },
    calls: {
      live_now: 7,
      answer_rate: 84.2,
      answer_rate_delta: -2.6,
      median_connected_seconds: 412,
      median_ring_seconds: 9,
      outcomes: [{ label: 'ended', value: 812 }],
      funnel: { booked: 640, paid: 592, started: 548, completed: 517 },
      quality: {
        permission_blocked: 34,
        ended_without_signal: 21,
        token_renewals: 88,
        backgrounded: 143,
      },
      end_reasons: [{ label: 'hangup', value: 694 }],
    },
    growth: {
      signups_clients: [{ bucket: '2026-08-16T00:00:00.000Z', value: 42 }],
      signups_professionals: [{ bucket: '2026-08-16T00:00:00.000Z', value: 8 }],
      activation: {
        registered: 1284,
        registered_delta: 9.4,
        email_verified: 1102,
        phone_verified: 968,
        phone_verified_delta: 7.1,
        kyc_submitted: 341,
        kyc_approved: 298,
        kyc_approved_delta: 12.8,
        first_call: 212,
        first_call_delta: 5.2,
      },
      supply: { bookable: 246, approved: 298, available_now: 84, missing_rates: 52 },
      engagement: {
        dau: 1842,
        wau: 6310,
        mau: 14_920,
        messages: 8412,
        schedules_accepted: 184,
        schedules_declined: 47,
      },
    },
    platform: {
      split: [{ label: 'android', value: 4120 }],
      versions: [{ version: '1.3.9', platform: 'android', sessions: 820 }],
      os_spread: [{ label: 'Android 14', value: 1820 }],
      top_devices: [{ label: 'iPhone 14', value: 640 }],
      gates: [{ platform: 'android', min_version: '1.4.0', forced: false }],
      push: { registered_tokens: 5412, active_users: 6310 },
    },
    trust: {
      reports_pending: 11,
      reports_oldest_seconds: 194_400,
      average_rating: 4.62,
      reviews_in_period: 428,
      users_suspended: 14,
      users_blocked: 3,
      report_reasons: [{ label: 'harassment', value: 24 }],
      actions_by_admin: [{ label: 'ops@ohlify.test', value: 184 }],
      recent_actions: [
        {
          id: 'a1',
          actor: 'ops@ohlify.test',
          action: 'wallets.manual_journal',
          target_type: 'journal',
          target_id: 'JNL-4821',
          created_at: '2026-08-23T14:22:00.000Z',
        },
      ],
    },
    generated_at: '2026-08-23T14:30:00.000Z',
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardScreen />
    </MemoryRouter>,
  );
}

describe('the dashboard', () => {
  let errors: string[] = [];
  let originalError: typeof console.error;

  beforeEach(() => {
    mockRole.current = 'admin';
    mockQuery.current = {
      data: makeDashboard(),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: () => undefined,
    };
    errors = [];
    originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    };
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    cleanup();
  });

  it('renders every section from live-shaped data, clean', () => {
    renderDashboard();

    for (const section of [
      'Needs attention',
      'Money',
      'Calls',
      'Growth',
      'Platform and clients',
      'Trust and moderation',
    ]) {
      expect(screen.getByLabelText(section)).toBeTruthy();
    }

    expect(errors).toEqual([]);
  });

  it('renders skeletons while loading, without dropping section headings', () => {
    mockQuery.current = { ...mockQuery.current, data: undefined, isLoading: true };
    renderDashboard();

    // Headings persist so the page does not shift when data lands.
    expect(screen.getByLabelText('Needs attention')).toBeTruthy();
    expect(screen.getByLabelText('Calls')).toBeTruthy();
    // And the wait is announced rather than silent.
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  it('shows an error state instead of empty panels when the request fails', () => {
    // Five empty panels would read as "the platform was idle", which is a very
    // different claim from "the request failed".
    mockQuery.current = {
      ...mockQuery.current,
      data: undefined,
      error: { errorMessage: 'Service unavailable' },
    };
    renderDashboard();

    expect(screen.getByText('Could not load the dashboard')).toBeTruthy();
    expect(screen.getByText('Service unavailable')).toBeTruthy();
    expect(screen.queryByLabelText('Calls')).toBeNull();
  });

  it('hides the money section from support', () => {
    mockRole.current = 'support';
    renderDashboard();

    expect(screen.queryByLabelText('Money')).toBeNull();
    expect(screen.getByLabelText('Calls')).toBeTruthy();
    expect(errors).toEqual([]);
  });

  it('shows the money section to finance', () => {
    mockRole.current = 'finance_ops';
    renderDashboard();
    expect(screen.getByLabelText('Money')).toBeTruthy();
    expect(errors).toEqual([]);
  });

  it('states the bucket timezone', () => {
    renderDashboard();
    expect(screen.getByText('All buckets UTC')).toBeTruthy();
  });

  it('switches range without breaking', () => {
    renderDashboard();

    const weekTab = screen.getByRole('tab', { name: RANGE_SPECS[DashboardRange.WEEK].label });
    expect(weekTab.getAttribute('aria-selected')).toBe('true');

    const quarterTab = screen.getByRole('tab', {
      name: RANGE_SPECS[DashboardRange.QUARTER].label,
    });
    fireEvent.click(quarterTab);

    expect(quarterTab.getAttribute('aria-selected')).toBe('true');
    expect(weekTab.getAttribute('aria-selected')).toBe('false');
    expect(errors).toEqual([]);
  });
});

describe('dashboard adapters', () => {
  it('drops zero-count attention signals', () => {
    // A row of zeroes trains people to skim past the band, defeating it.
    const signals = toAttentionSignals(makeDashboard());
    const keys = signals.map((s) => s.key);
    expect(keys).toContain('uncredited_payments');
    expect(keys).toContain('kyc');
    expect(keys).not.toContain('suspense');
    expect(keys).not.toContain('withdrawals_stuck');
  });

  it('gives every surfaced signal a destination and a reason', () => {
    for (const signal of toAttentionSignals(makeDashboard())) {
      expect(signal.to.startsWith('/')).toBe(true);
      expect(signal.hint.length).toBeGreaterThan(0);
    }
  });

  it('formats queue ages by magnitude', () => {
    expect(formatAge(null)).toBeUndefined();
    expect(formatAge(2520)).toBe('oldest 42m');
    expect(formatAge(7200)).toBe('oldest 2h');
    expect(formatAge(1_886_935)).toBe('oldest 21d 20h');
  });

  it('labels the funnel for what call_status actually measures', () => {
    // The live enum has no unpaid state — a call row exists only once payment
    // settled — so "paid" would name a stage that cannot drop out.
    const labels = toFunnel(makeDashboard()).map((step) => step.label);
    expect(labels).toEqual(['Scheduled', 'Reached start', 'Both joined', 'Completed']);
  });
});
