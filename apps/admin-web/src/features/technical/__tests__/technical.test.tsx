import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminTechnicalDashboard } from '@ohlify/api';

import { TechnicalScreen } from '../screens/technical-screen.js';
import { formatSeconds, formatUptime, hasTechnicalAlert } from '../parts/technical-adapters.js';

/**
 * The technical board's behaviour against live-shaped data.
 *
 * Console errors fail the test: this page renders five sections of mapped
 * lists and four tables, which is exactly where a duplicate key or invalid DOM
 * nesting hides from the type-checker.
 */

const mockQuery = vi.hoisted(() => ({
  live: true,
  current: {
    data: undefined as AdminTechnicalDashboard | undefined,
    isLoading: false,
    isFetching: false,
    error: null as { errorMessage?: string } | null,
    dataUpdatedAt: 0,
    refetch: () => undefined,
  },
}));

vi.mock('../api/use-technical.js', () => ({
  TECHNICAL_REFRESH_MS: 30_000,
  // Captures the `live` flag so a test can assert pausing actually reaches the
  // hook rather than only relabelling the button.
  useTechnical: (_range: string, live: boolean) => {
    mockQuery.live = live;
    return mockQuery.current;
  },
}));

function makeTechnical(
  overrides: Partial<AdminTechnicalDashboard> = {},
): AdminTechnicalDashboard {
  return {
    range: '7d',
    window: { from: '2026-08-16T00:00:00.000Z', to: '2026-08-23T00:00:00.000Z' },
    health: {
      dependencies: [
        { key: 'db', state: 'ok', detail: '2ms' },
        { key: 'redis', state: 'ok', detail: '1ms' },
      ],
      pool: { total: 12, idle: 9, waiting: 0, max: 20 },
      redis: {
        used_memory_mb: 84,
        connected_clients: 18,
        evicted_keys: 0,
        hit_rate_percent: 96.4,
      },
      process: {
        uptime_seconds: 389_520,
        heap_used_mb: 186,
        heap_total_mb: 312,
        rss_mb: 428,
        node_version: '22.11.0',
        commit_sha: 'e33aa06',
        booted_at: '2026-08-19T02:41:00.000Z',
        migration_version: '0103_auth_events',
      },
    },
    outbox: {
      backlog: 18,
      oldest_lag_seconds: 160,
      dead_lettered: 4,
      published_last_hour: 142,
      retries: [{ label: '0', value: 11 }],
      failures_by_type: [{ label: 'push.chat_message', value: 9 }],
      dead_letters: [
        {
          id: 'obx_9f21',
          event_type: 'push.chat_message',
          aggregate_type: 'chat',
          aggregate_id: 'cnv_4471',
          attempts: 8,
          error: 'FCM: messaging/invalid-argument',
          age_seconds: 11_520,
        },
      ],
    },
    integrations: {
      webhooks: {
        unprocessed: 3,
        oldest_unprocessed_seconds: 2520,
        errored: 3,
        replayed: 11,
        by_type: [
          { event_type: 'charge.success', received: 1284, processed: 1282, errored: 2 },
        ],
      },
      push: { registered_tokens: 6, ios: 1, android: 5, web: 0 },
      agora: { signature_verification_enabled: false },
    },
    api: {
      idempotency: { keys_stored: 4128, replays: 312, by_route: [] },
      auth: {
        logins: 4120,
        login_failures: 386,
        registrations: 1284,
        registration_failures: 142,
        password_resets: 318,
        suspicious_ips: 7,
        failure_reasons: [{ label: 'invalid_credentials', value: 248 }],
        recent: [
          {
            id: 'ae_1',
            event: 'login',
            outcome: 'failure',
            reason: 'invalid_credentials',
            subject: 'a****@gmail.com',
            ip: '102.89.1.1',
            platform: 'android',
            app_version: '1.4.2',
            created_at: '2026-08-23T14:31:02.000Z',
          },
        ],
      },
    },
    realtime: { connections: 842, distinct_users: 786 },
    integrity: {
      ledger_balanced: true,
      drift_accounts: [],
      unsettled_calls: 2,
      expired_intents: 14,
      orphan_device_tokens: 0,
    },
    config: {
      total_keys: 75,
      public_keys: 50,
      changed_this_week: 3,
      recent_changes: [
        {
          key: 'features.kyc_v2',
          value: 'true',
          is_public: true,
          updated_at: '2026-08-23T12:00:00.000Z',
          updated_by: 'ops@ohlify.test',
        },
      ],
      version_gates: [
        { platform: 'android', min_version: '1.4.0', forced: false, sessions_below: 980 },
      ],
    },
    call_streams: {
      server_events: 12_840,
      client_events: 41_206,
      missing_client_end: 21,
      orphan_client_streams: 3,
      client_event_mix: [{ label: 'ca:join', value: 9680 }],
    },
    generated_at: '2026-08-23T14:31:00.000Z',
    ...overrides,
  };
}

describe('the technical dashboard', () => {
  let errors: string[] = [];
  let originalError: typeof console.error;

  beforeEach(() => {
    mockQuery.live = true;
    mockQuery.current = {
      data: makeTechnical(),
      isLoading: false,
      isFetching: false,
      error: null,
      dataUpdatedAt: Date.UTC(2026, 7, 23, 14, 31, 0),
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

  const renderScreen = () =>
    render(
      <MemoryRouter>
        <TechnicalScreen />
      </MemoryRouter>,
    );

  it('renders every section from live-shaped data, clean', () => {
    renderScreen();

    for (const section of [
      'Service health',
      'Eventing',
      'Integrations',
      'API and auth',
      'Platform state',
    ]) {
      expect(screen.getByLabelText(section)).toBeTruthy();
    }

    expect(errors).toEqual([]);
  });

  it('renders skeletons while loading without losing headings', () => {
    mockQuery.current = { ...mockQuery.current, data: undefined, isLoading: true };
    renderScreen();

    expect(screen.getByLabelText('Service health')).toBeTruthy();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  it('shows an error state rather than empty panels', () => {
    mockQuery.current = {
      ...mockQuery.current,
      data: undefined,
      error: { errorMessage: 'Service unavailable' },
    };
    renderScreen();

    expect(screen.getByText('Could not load technical metrics')).toBeTruthy();
    expect(screen.queryByLabelText('Eventing')).toBeNull();
  });

  it('actually stops polling when paused', () => {
    renderScreen();
    expect(screen.getByText(/refreshing every 30s/)).toBeTruthy();
    expect(mockQuery.live).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Pause/ }));

    // A paused page that keeps refetching is paused in name only — this
    // asserts the flag reaches the hook, not just the label.
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(mockQuery.live).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /Resume/ }));
    expect(mockQuery.live).toBe(true);
    expect(errors).toEqual([]);
  });

  it('warns when Agora signature verification is off', () => {
    // Nothing else on the platform would reveal that every delivery is being
    // accepted unverified.
    renderScreen();
    expect(screen.getByText('Signature verification is off')).toBeTruthy();
  });

  it('says what is not tracked rather than inventing it', () => {
    renderScreen();
    expect(
      screen.getByText(/Per-request latency and worker heartbeats are out of scope/),
    ).toBeTruthy();
  });
});

describe('technical adapters', () => {
  it('formats ages by magnitude', () => {
    expect(formatSeconds(null)).toBeUndefined();
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(160)).toBe('3m');
    expect(formatSeconds(7200)).toBe('2h');
    expect(formatSeconds(90_000)).toBe('1d 1h');
  });

  it('formats uptime in coarse units', () => {
    expect(formatUptime(389_520)).toBe('4d 12h 12m');
    expect(formatUptime(3660)).toBe('1h 1m');
    expect(formatUptime(120)).toBe('2m');
  });

  it('detects an alert-worthy board', () => {
    // Dead letters and stuck webhooks both count; a clean board does not.
    expect(hasTechnicalAlert(makeTechnical())).toBe(true);

    const clean = makeTechnical();
    clean.outbox.dead_lettered = 0;
    clean.integrations.webhooks.unprocessed = 0;
    clean.integrations.webhooks.errored = 0;
    expect(hasTechnicalAlert(clean)).toBe(false);
  });
});
