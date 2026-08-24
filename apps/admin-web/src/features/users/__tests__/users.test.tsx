import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminUserDetail, AdminUserListItem } from '@ohlify/api';

import { UserDetailScreen } from '../screens/user-detail-screen.js';
import { UsersListScreen } from '../screens/users-list-screen.js';
import { buildLifecycle, displayName } from '../parts/user-adapters.js';
import { maskAccount, relativeTime, statusFor } from '../parts/user-status.js';

/**
 * Render sweep for the user surfaces.
 *
 * Console errors fail the test: the detail screen renders five tabs' worth of
 * mapped lists and seven tables, which is exactly where a duplicate key or
 * invalid DOM nesting hides from the type-checker.
 */

const mockRole = vi.hoisted(() => ({ current: 'admin' as string }));

/**
 * The Trust tab previews the KYC document and selfie, and `FilePreview`
 * resolves a signed URL through React Query — so the tree needs a client.
 * Retries off so a failed preview fails fast rather than making the sweep slow.
 */
function withProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

const listState = vi.hoisted(() => ({
  current: {
    items: [] as AdminUserListItem[],
    isLoading: false,
    isFetching: false,
    error: null as { errorMessage?: string } | null,
    hasNext: false,
    hasPrev: false,
    goNext: () => undefined,
    goPrev: () => undefined,
    reset: () => undefined,
    refetch: () => undefined,
  },
}));

const detailState = vi.hoisted(() => ({
  current: {
    data: undefined as AdminUserDetail | undefined,
    isLoading: false,
    isFetching: false,
    error: null as { errorMessage?: string } | null,
    refetch: () => undefined,
  },
}));

vi.mock('../api/use-users.js', () => {
  // Declared INSIDE the factory: `vi.mock` is hoisted above the module body,
  // so a const defined outside it is still in its temporal dead zone here.
  const noopMutation = () => ({ mutate: () => undefined, isPending: false });
  return {
    useAdminUsers: () => listState.current,
    useAdminUserCounts: () => ({
      data: { all: 6, active: 4, suspended: 1, blocked: 1 },
      isLoading: false,
    }),
    useAdminUser: () => detailState.current,
    useSuspendUser: noopMutation,
    useUnsuspendUser: noopMutation,
    useBlockUser: noopMutation,
    useUnblockUser: noopMutation,
    useResetUserPassword: noopMutation,
    useImpersonateUser: noopMutation,
  };
});

vi.mock('../../../shared/auth/use-current-admin.js', () => ({
  useCurrentAdmin: () => ({
    id: 'adm_1',
    email: 'ops@ohlify.test',
    full_name: 'Feranmi Adeniji',
    role: mockRole.current,
  }),
}));

function makeListRow(over: Partial<AdminUserListItem> = {}): AdminUserListItem {
  return {
    id: 'usr_1',
    role: 'professional',
    status: 'active',
    email: 'adaeze@example.com',
    email_verified_at: '2026-02-14T09:20:00.000Z',
    phone_number: '+2348012345678',
    phone_verified_at: '2026-02-14T09:22:00.000Z',
    full_name: 'Adaeze Okonkwo',
    handle: 'adaeze',
    avatar_url: null,
    occupation: 'Immigration lawyer',
    description: null,
    kyc_status: 'approved',
    kyc_submitted_at: '2026-02-16T14:03:00.000Z',
    kyc_reviewed_at: '2026-02-18T10:41:00.000Z',
    kyc_reject_reason: null,
    last_seen_at: '2026-08-23T13:40:00.000Z',
    suspended_until: null,
    created_at: '2026-02-14T09:12:00.000Z',
    updated_at: '2026-08-23T13:40:00.000Z',
    rating: 4.8,
    review_count: 126,
    wallet_kobo: 8_420_000,
    calls_total: 214,
    active_strikes: 0,
    ...over,
  };
}

function makeDetail(over: Partial<AdminUserDetail> = {}): AdminUserDetail {
  return {
    ...makeListRow(),
    vitals: {
      wallet_kobo: 8_420_000,
      lifetime_earned_kobo: 41_600_000,
      lifetime_spent_kobo: 2_180_000,
      escrow_kobo: 1_629_000,
      calls_total: 214,
      calls_completed: 198,
      calls_missed: 16,
      rating: 4.8,
      review_count: 126,
      active_strikes: 0,
    },
    profile: {
      cover_photo_url: null,
      selfie_upload_key: 'kyc/selfie/usr_1.jpg',
      interests: ['Law'],
      categories: ['legal'],
      is_available: true,
      handle_changed_at: null,
    },
    kyc_extra: { submission_count: 1, reject_item_keys: [] },
    calls: [
      {
        id: 'ic_4821',
        counterparty_id: 'usr_2',
        counterparty_name: 'Fatima Bello',
        direction: 'incoming',
        call_type: 'video',
        status: 'ended',
        connected_seconds: 1842,
        settled_kobo: 1_530_000,
        created_at: '2026-08-23T10:12:00.000Z',
      },
    ],
    reviews: [
      {
        id: 'rev_1',
        reviewer_name: 'Fatima Bello',
        rating: 5,
        feedback: 'Clear and helpful.',
        hidden: false,
        created_at: '2026-08-23T10:50:00.000Z',
      },
    ],
    strikes: [],
    reports: [],
    sessions: [
      {
        id: 'sess_1',
        platform: 'android',
        app_version: '1.4.2',
        device_model: 'SM-S911U',
        os_version: 'Android 14',
        ip: '102.89.1.1',
        created_at: '2026-08-20T08:00:00.000Z',
        last_used_at: '2026-08-23T13:40:00.000Z',
      },
    ],
    auth_events: [],
    devices: [
      {
        token_suffix: '…f4a219',
        platform: 'android',
        app_version: '1.4.2',
        device_model: 'SM-S911U',
        last_seen_at: '2026-08-23T13:40:00.000Z',
      },
    ],
    notification_prefs: { sms_enabled: true, email_enabled: true, push_enabled: false },
    tickets: [],
    chat: { conversations: 38, messages_sent: 412, last_message_at: '2026-08-23T12:02:00.000Z' },
    admin_actions: [],
    money: {
      rates: [{ id: 'r1', call_type: 'audio', duration_minutes: 15, price_kobo: 500_000 }],
      transactions: [
        {
          id: 'we_1',
          kind: 'call_settlement',
          direction: 'credit',
          amount_kobo: 1_530_000,
          balance_after_kobo: 8_420_000,
          memo: 'IC-4821',
          created_at: '2026-08-23T10:43:00.000Z',
        },
      ],
      withdrawals: [],
      minutes_held: [],
    },
    kyc_submission: {
      id: 'kyc_1',
      identity_type: 'nin',
      identity_number: '•••• 4821',
      document_upload_id: 'upl_1',
      selfie_upload_key: 'kyc/selfie/usr_1.jpg',
      status: 'approved',
      reviewed_by: 'ops@ohlify.dev',
      reviewed_at: '2026-02-18T10:41:00.000Z',
      reject_reason_code: null,
      reject_note: null,
      created_at: '2026-02-16T14:03:00.000Z',
    },
    bank_account: {
      bank_code: '058',
      bank_name: 'GTBank',
      account_number_last4: '6789',
      account_name: 'ADAEZE OKONKWO',
      added_at: '2026-02-20T11:04:00.000Z',
    },
    wallet: { currency: 'NGN', available_kobo: 8_420_000, pending_kobo: 0 },
    ...over,
  } as AdminUserDetail;
}

describe('the users list', () => {
  let errors: string[] = [];
  let originalError: typeof console.error;

  beforeEach(() => {
    mockRole.current = 'admin';
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

  const renderList = () =>
    render(
      withProviders(
        <MemoryRouter>
          <UsersListScreen />
        </MemoryRouter>,
      ),
    );

  it('renders rows from the API, clean', () => {
    listState.current = {
      ...listState.current,
      items: [
        makeListRow(),
        makeListRow({ id: 'usr_2', full_name: 'Chidi Nwosu', handle: 'chidi', active_strikes: 3 }),
      ],
    };
    renderList();

    expect(screen.getByText('Users')).toBeTruthy();
    expect(screen.getByText('Adaeze Okonkwo')).toBeTruthy();
    expect(screen.getByText('Chidi Nwosu')).toBeTruthy();
    // Strikes take precedence over rating in the standing column.
    expect(screen.getByText('3 strikes')).toBeTruthy();
    expect(errors).toEqual([]);
  });

  it('shows tab counts from meta, not from the current page', () => {
    listState.current = { ...listState.current, items: [makeListRow()] };
    renderList();
    // One row on screen, but the tabs report the unfiltered totals.
    expect(screen.getByRole('tab', { name: /All/ }).textContent).toContain('6');
    expect(screen.getByRole('tab', { name: /Suspended/ }).textContent).toContain('1');
  });

  it('renders a loading table rather than an empty one', () => {
    listState.current = { ...listState.current, items: [], isLoading: true };
    renderList();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(screen.queryByText('No users match')).toBeNull();
  });

  it('surfaces a list error on a cold cache', () => {
    // No rows AND an error is the cold-cache case: the table takes the whole
    // surface rather than showing an empty state, which would read as "no
    // users exist".
    listState.current = {
      ...listState.current,
      items: [],
      isLoading: false,
      error: { errorMessage: 'Service unavailable' },
    };
    renderList();
    expect(screen.getByText('Could not load')).toBeTruthy();
    expect(screen.getByText('Service unavailable')).toBeTruthy();
  });
});

describe('the user detail screen', () => {
  let errors: string[] = [];
  let originalError: typeof console.error;

  beforeEach(() => {
    mockRole.current = 'admin';
    detailState.current = {
      data: makeDetail(),
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

  const renderDetail = () =>
    render(
      withProviders(
        <MemoryRouter initialEntries={['/users/usr_01hq2x9k4m8p2v6r']}>
          <Routes>
            <Route path="/users/:id" element={<UserDetailScreen />} />
          </Routes>
        </MemoryRouter>,
      ),
    );

  it('renders the identity hero and overview tab, clean', () => {
    renderDetail();

    expect(screen.getAllByText('Adaeze Okonkwo').length).toBeGreaterThan(0);
    expect(screen.getByText('Identity')).toBeTruthy();
    expect(screen.getByText('Account lifecycle')).toBeTruthy();
    expect(errors).toEqual([]);
  });

  it('renders every tab without throwing', () => {
    renderDetail();

    // Each tab mounts a different set of tables and mapped lists; a key
    // collision in any one of them only shows up when it is actually rendered.
    for (const [name, marker] of [
      ['Money', 'Payout account'],
      ['Activity', 'Support tickets'],
      ['Trust', 'KYC'],
      ['Security', 'Active sessions'],
    ] as const) {
      fireEvent.click(screen.getByRole('tab', { name: new RegExp(name) }));
      expect(screen.getAllByText(marker).length).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    }
  });

  it('hides the money tab from support', () => {
    // The ledger is finance-gated on the backend; offering the tab would make
    // it 403 on open.
    mockRole.current = 'support';
    renderDetail();

    expect(screen.queryByRole('tab', { name: /Money/ })).toBeNull();
    expect(screen.getByRole('tab', { name: /Security/ })).toBeTruthy();
    expect(errors).toEqual([]);
  });

  it('shows the money tab to finance', () => {
    mockRole.current = 'finance_ops';
    renderDetail();
    expect(screen.getByRole('tab', { name: /Money/ })).toBeTruthy();
  });

  it('offers every operator action without hiding any', () => {
    renderDetail();

    // The first cut buried four of six behind an overflow, which made every
    // task a click longer on a screen people come to in order to DO something.
    for (const label of [
      /Reset password/,
      /Impersonate/,
      /Revoke sessions/,
      /Suspend/,
      /Block/,
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('says the chat panel shows volume only', () => {
    // Reading private messages should not be possible by accident.
    renderDetail();
    fireEvent.click(screen.getByRole('tab', { name: /Activity/ }));
    expect(screen.getByText(/message contents are not shown/i)).toBeTruthy();
  });

  it('warns when push is disabled', () => {
    // "I never got the notification" is nearly always this switch.
    renderDetail();
    expect(screen.getByText(/Push is off/)).toBeTruthy();
  });

  it('renders a skeleton while the detail loads', () => {
    detailState.current = { ...detailState.current, data: undefined, isLoading: true };
    renderDetail();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  it('surfaces a detail error instead of an empty shell', () => {
    detailState.current = {
      ...detailState.current,
      data: undefined,
      error: { errorMessage: 'Not found' },
    };
    renderDetail();
    expect(screen.getByText('Could not load this user')).toBeTruthy();
  });
});

describe('user status helpers', () => {
  it('maps backend status values Hawk does not know', () => {
    // Hawk's registry names states in user language while the schema names
    // them in system language, so lookupStatus('kyc','approved') misses.
    expect(statusFor('kyc', 'approved').label).toBe('Verified');
    expect(statusFor('kyc', 'pending_review').label).toBe('Under review');
    expect(statusFor('user', 'blocked').label).toBe('Blocked');
    expect(statusFor('withdrawal', 'completed').label).toBe('Paid');
  });

  it('falls back to a humanised label rather than rendering nothing', () => {
    // An unknown status is a deploy-order problem; an unlabelled row is worse
    // than an uncoloured one.
    expect(statusFor('user', 'some_new_state').label).toBe('Some new state');
    expect(statusFor('user', null).label).toBe('—');
  });

  it('masks all but the last four digits of an account number', () => {
    expect(maskAccount('0123456789')).toBe('••••••6789');
    expect(maskAccount('1234')).toBe('1234');
  });

  it('formats relative time by magnitude', () => {
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
    expect(relativeTime(null)).toBe('—');
    expect(relativeTime(ago(30_000))).toBe('just now');
    expect(relativeTime(ago(3 * 60_000))).toBe('3m ago');
    expect(relativeTime(ago(5 * 3_600_000))).toBe('5h ago');
    expect(relativeTime(ago(3 * 86_400_000))).toBe('3d ago');
  });
});

describe('user adapters', () => {
  it('builds a lifecycle from the timestamps that exist', () => {
    const steps = buildLifecycle(makeDetail());
    const labels = steps.map((step) => step.label);
    expect(labels).toEqual([
      'Registered',
      'Email verified',
      'Phone verified',
      'KYC submitted',
      'KYC approved',
      'First call',
    ]);
    // The gap is the finding, not the date.
    expect(steps[1]?.description).toContain('later');
  });

  it('drops stages that never happened rather than showing them pending', () => {
    // A client has no KYC stage at all; an empty one implies something is
    // outstanding when nothing is.
    const steps = buildLifecycle(
      makeDetail({ kyc_submitted_at: null, kyc_reviewed_at: null, calls: [] }),
    );
    expect(steps.map((s) => s.label)).toEqual([
      'Registered',
      'Email verified',
      'Phone verified',
    ]);
  });

  it('marks a rejected KYC as failed, not as unreached', () => {
    const steps = buildLifecycle(makeDetail({ kyc_status: 'rejected' }));
    const kyc = steps.find((step) => step.label === 'KYC rejected');
    expect(kyc?.status).toBe('failed');
  });

  it('falls back through name, handle, then email', () => {
    expect(displayName({ full_name: 'A', handle: 'b', email: 'c@d.e' })).toBe('A');
    expect(displayName({ full_name: null, handle: 'b', email: 'c@d.e' })).toBe('b');
    expect(displayName({ full_name: null, handle: null, email: 'c@d.e' })).toBe('c@d.e');
  });
});
