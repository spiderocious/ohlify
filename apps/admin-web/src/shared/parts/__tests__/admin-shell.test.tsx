import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardScreen } from '../../../features/dashboard/screens/dashboard-screen.js';
import { activeNavKey, visibleHawkNavItems } from '../../config/hawk-nav-items.js';
import { AdminShell } from '../admin-shell.js';

/**
 * The render sweep, applied to the first migrated surfaces.
 *
 * Same reasoning as the gallery's: the type-checker cannot see a null-deref in
 * a builder, a key collision, or a component that throws because a required
 * child is missing. Those are runtime failures on code that compiles perfectly,
 * and the shell is now on every authenticated page — a throw here takes down
 * the whole admin app rather than one screen.
 *
 * `console.error` fails the test too. React reports key collisions and invalid
 * DOM nesting through it rather than by throwing, so ignoring it would pass
 * over exactly the problems that are cheapest to fix.
 */

/**
 * The dashboard fetches, so the tree needs a client. Retries off and no
 * network: this file tests the SHELL, and a real request would make it slow
 * and flaky for a reason unrelated to what it asserts.
 */
function withProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

vi.mock('../../../features/dashboard/api/use-dashboard.js', () => ({
  useDashboard: () => ({
    data: undefined,
    isLoading: true,
    isFetching: false,
    error: null,
    refetch: () => undefined,
  }),
}));

vi.mock('../../auth/use-current-admin.js', () => ({
  useCurrentAdmin: () => ({
    id: 'adm_1',
    email: 'ops@ohlify.test',
    full_name: 'Feranmi Adeniji',
    role: 'admin',
  }),
}));

describe('the migrated admin shell', () => {
  let errors: string[] = [];
  let originalError: typeof console.error;

  beforeEach(() => {
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

  it('renders the shell with the dashboard inside it, clean', () => {
    render(
      withProviders(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<AdminShell />}>
              <Route path="/dashboard" element={<DashboardScreen />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      ),
    );

    // The shell drew its chrome...
    expect(screen.getByText('Ohlify')).toBeTruthy();
    // ...and the operator footer resolved the role to its human label.
    //
    // Scoped to the footer rather than matched globally: the word "Admin"
    // appears four times on this screen (brand mark, breadcrumb, this footer,
    // and an audit entry's actor role). A bare getByText would be ambiguous,
    // and asserting a count of four would fail the moment any one of those
    // legitimately changes.
    const name = screen.getByText('Feranmi Adeniji');
    const footer = name.closest('div')?.parentElement;
    expect(footer?.textContent).toContain('Admin');
    // ...and the dashboard rendered through the Outlet. Asserted on its
    // headings rather than on a figure: the hook is mocked as loading here,
    // because this file tests the shell, not the data.
    expect(screen.getByLabelText('Needs attention')).toBeTruthy();
    expect(screen.getByLabelText('Calls')).toBeTruthy();

    expect(errors).toEqual([]);
  });

  it('renders every group heading exactly once', () => {
    render(
      withProviders(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<AdminShell />}>
              <Route path="/dashboard" element={<div />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      ),
    );

    // A duplicated heading means two non-adjacent runs share a group name —
    // the one way the declaration-order grouping can be got wrong.
    for (const group of ['People', 'Activity', 'Money', 'Platform']) {
      expect(screen.getAllByText(group)).toHaveLength(1);
    }
    expect(errors).toEqual([]);
  });
});

describe('nav grouping', () => {
  it('keeps every item of a group adjacent', () => {
    // HawkAdminShell starts a new group whenever `group` changes as it walks
    // the list. Non-adjacent items sharing a name would render two headings.
    const seen = new Set<string>();
    let previous: string | undefined;
    for (const item of visibleHawkNavItems('admin')) {
      if (item.group === previous) continue;
      if (item.group !== undefined) {
        expect(seen.has(item.group)).toBe(false);
        seen.add(item.group);
      }
      previous = item.group;
    }
  });

  it('carries over every destination from the pre-Hawk sidebar', () => {
    // The redesign regrouped the sidebar; it must not quietly drop a screen.
    // Asserted as a subset rather than an exact count — new destinations are
    // expected over time (Technical was one), but losing an old one never is.
    const keys = visibleHawkNavItems('admin').map((i) => i.key);
    const PRE_HAWK = [
      'dashboard', 'users', 'kyc', 'calls', 'bookings', 'withdrawals',
      'refunds', 'transactions', 'wallets', 'webhooks', 'reports',
      'reviews', 'strikes', 'content', 'config', 'releases', 'campaigns', 'audit',
    ];
    for (const key of PRE_HAWK) {
      expect(keys).toContain(key);
    }
    expect(keys.length).toBeGreaterThanOrEqual(PRE_HAWK.length);
  });

  it('gates by role the way the backend does', () => {
    const support = visibleHawkNavItems('support').map((i) => i.key);
    expect(support).toContain('kyc');
    expect(support).not.toContain('withdrawals');

    const finance = visibleHawkNavItems('finance_ops').map((i) => i.key);
    expect(finance).toContain('withdrawals');
    expect(finance).not.toContain('kyc');
    expect(finance).not.toContain('config');
  });

  it('resolves the active item by longest prefix', () => {
    const items = visibleHawkNavItems('admin');
    // A sub-route must light up its parent...
    expect(activeNavKey('/wallets/journals', items)).toBe('wallets');
    expect(activeNavKey('/users/usr_123', items)).toBe('users');
    // ...and Dashboard must not swallow every path just because it is short.
    expect(activeNavKey('/dashboard', items)).toBe('dashboard');
    expect(activeNavKey('/users', items)).toBe('users');
  });
});
