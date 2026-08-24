import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AdminUserListItem } from '@ohlify/api';

import {
  HawkAdminPageHeader,
  HawkAvatar,
  HawkBadge,
  HawkBulkActionBar,
  HawkButton,
  HawkCaption,
  HawkDataState,
  HawkDot,
  HawkDropdown,
  HawkFilterBar,
  HawkIcon,
  HawkKpiStrip,
  HawkSemantic,
  HawkStatusBadge,
  HawkTable,
  HawkText,
  IconAlertTriangle,
  IconDownload,
  IconIdCard,
  IconShield,
  IconStar,
  IconUsers,
  IconVerified,
  cn,
  formatKoboCompact,
  type HawkColumn,
  type HawkKpi,
  type HawkSort,
} from '@ohlify/hawk-ui';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { ADMIN_ROUTES } from '../../../shared/routes/admin-routes.js';
import { useAdminUserCounts, useAdminUsers } from '../api/use-users.js';
import { relativeTime, statusFor } from '../parts/user-status.js';

type UserListRow = AdminUserListItem;

/**
 * The user directory.
 *
 * Two things drive the design, and both come from what an operator is actually
 * doing when they open this page:
 *
 * **They arrive with a name, an email or a phone number** — from a support
 * ticket, a payment reference, a complaint. So search leads, and the row is
 * built to confirm identity at a glance: avatar, name, handle, email, and the
 * verification marks that say whether those contact details were ever proven.
 *
 * **Or they arrive to triage** — who is suspended, who is stuck in KYC, who is
 * accumulating strikes. So the status tabs carry live counts, and the columns
 * that answer "is something wrong with this account" (KYC, strikes) sit before
 * the ones that merely describe it.
 */

type StatusTab = 'all' | 'active' | 'suspended' | 'blocked';

export function UsersListScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<StatusTab>('all');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [kyc, setKyc] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<HawkSort>({ key: 'created', direction: 'desc' });

  // Debounced, because the query hits the database on every keystroke
  // otherwise — and a search that fires per character is a search that
  // rate-limits itself.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const list = useAdminUsers({
    q: debouncedQuery || undefined,
    status: tab === 'all' ? undefined : tab,
    role: role || undefined,
    kyc_status: kyc || undefined,
  });
  const counts = useAdminUserCounts();
  const tabCounts = counts.data ?? { all: 0, active: 0, suspended: 0, blocked: 0 };

  const rows = list.items;

  // A selection that survives a filter change would let an operator act on
  // rows they can no longer see.
  useEffect(() => {
    setSelected(new Set());
  }, [tab, debouncedQuery, role, kyc]);

  const kpis: HawkKpi[] = [
    {
      key: 'total',
      label: 'Total users',
      value: tabCounts.all.toLocaleString(),
      icon: IconUsers,
    },
    {
      key: 'active',
      label: 'Active',
      value: tabCounts.active.toLocaleString(),
      icon: IconVerified,
      semantic: 'success',
    },
    {
      key: 'suspended',
      label: 'Suspended',
      value: tabCounts.suspended.toLocaleString(),
      icon: IconIdCard,
      semantic: 'caution',
    },
    {
      key: 'blocked',
      label: 'Blocked',
      value: tabCounts.blocked.toLocaleString(),
      icon: IconShield,
      semantic: 'critical',
    },
  ];

  const columns: ReadonlyArray<HawkColumn<UserListRow>> = [
    {
      key: 'user',
      header: 'User',
      width: '26%',
      render: (user) => <UserCell user={user} />,
    },
    {
      key: 'contact',
      header: 'Contact',
      width: '18%',
      render: (user) => <ContactCell user={user} />,
    },
    {
      key: 'role',
      header: 'Role',
      width: '10%',
      render: (user) => (
        <HawkBadge
          label={user.role === 'professional' ? 'Professional' : 'Client'}
          semantic={user.role === 'professional' ? HawkSemantic.INFO : HawkSemantic.NEUTRAL}
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '11%',
      render: (user) => <HawkStatusBadge status={statusFor('user', user.status)} size="sm" />,
    },
    {
      key: 'kyc',
      header: 'KYC',
      width: '12%',
      render: (user) => <HawkStatusBadge status={statusFor('kyc', user.kyc_status)} size="sm" />,
    },
    {
      key: 'standing',
      header: 'Standing',
      width: '13%',
      render: (user) => <StandingCell user={user} />,
    },
    {
      key: 'wallet',
      header: 'Wallet',
      align: 'right',
      width: '10%',
      sortable: true,
      render: (user) =>
        // Null means the caller may not see money, which is not the same as a
        // zero balance — a dash says "withheld", ₦0 says "empty".
        user.wallet_kobo === null || user.wallet_kobo === undefined ? (
          <span className="text-hawk-ink-disabled">—</span>
        ) : (
          <span className="hawk-record">{formatKoboCompact(user.wallet_kobo)}</span>
        ),
    },
    {
      key: 'created',
      header: 'Joined',
      align: 'right',
      sortable: true,
      render: (user) => (
        <span className="hawk-record text-hawk-ink-muted">{relativeTime(user.created_at)}</span>
      ),
    },
  ];

  return (
    <>
      <HawkAdminPageHeader
        title="Users"
        subtitle={`${tabCounts.all.toLocaleString()} accounts · clients and professionals`}
        actions={
          <HawkButton
            label="Export"
            variant="outline"
            startIcon={IconDownload}
            onClick={() => {}}
          />
        }
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        <HawkKpiStrip items={kpis} />

        <div className="flex flex-col">
          <HawkFilterBar
            tabs={[
              { value: 'all', label: 'All', count: tabCounts.all },
              { value: 'active', label: 'Active', count: tabCounts.active },
              { value: 'suspended', label: 'Suspended', count: tabCounts.suspended },
              { value: 'blocked', label: 'Blocked', count: tabCounts.blocked },
            ]}
            activeTab={tab}
            onTabChange={setTab}
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search name, handle, email or phone"
          >
            <HawkDropdown
              options={[
                { value: '', label: 'Any role' },
                { value: 'client', label: 'Client' },
                { value: 'professional', label: 'Professional' },
              ]}
              value={role}
              onChange={setRole}
              placeholder="Any role"
            />
            <HawkDropdown
              options={[
                { value: '', label: 'Any KYC' },
                { value: 'none', label: 'Not started' },
                { value: 'pending_review', label: 'Under review' },
                { value: 'approved', label: 'Verified' },
                { value: 'rejected', label: 'Action needed' },
              ]}
              value={kyc}
              onChange={setKyc}
              placeholder="Any KYC"
            />
          </HawkFilterBar>

          {/*
            Bulk actions are deliberately limited to the reversible ones.
            Blocking is not offered across a selection: it is the harshest
            action on this surface and it takes a reason, and a reason typed
            once for twenty accounts is not a reason.
          */}
          <HawkBulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
            <HawkButton label="Suspend selected" variant="outline" onClick={() => {}} />
            <HawkButton label="Export selected" variant="plain" onClick={() => {}} />
          </HawkBulkActionBar>

          <HawkTable
            columns={columns}
            rows={rows}
            rowKey={(user) => user.id}
            dataState={list.isLoading ? HawkDataState.LOADING : HawkDataState.FRESH}
            {...(list.error ? { error: list.error.errorMessage ?? 'Could not load users' } : {})}
            onRetry={() => list.refetch()}
            sort={sort}
            onSortChange={setSort}
            // Deleted accounts cannot be actioned, so they cannot be selected.
            selectable={(user) => user.status !== 'deleted'}
            selectedKeys={selected}
            onSelectionChange={setSelected}
            onRowClick={(user) => navigate(ADMIN_ROUTES.USERS.DETAIL.build({ id: user.id }))}
            emptyTitle="No users match"
            emptyDescription="Try a different status tab, or clear the search."
            footer={
              <CursorPagination
                hasPrev={list.hasPrev}
                hasNext={list.hasNext}
                onPrev={list.goPrev}
                onNext={list.goNext}
                itemCount={rows.length}
              />
            }
          />
        </div>
      </div>
    </>
  );
}

/**
 * Identity, at a glance.
 *
 * Name over handle over email, because that is the order an operator recognises
 * a person in — and the fallback chain matters: a user with no name and no
 * handle still has an email, and rendering "—" for them would make the row
 * useless.
 */
function UserCell({ user }: { user: UserListRow }) {
  const display = user.full_name ?? user.handle ?? user.email;
  const online =
    user.last_seen_at !== null && Date.now() - new Date(user.last_seen_at).getTime() < 300_000;

  return (
    <div className="flex items-center gap-hawk-4">
      <HawkAvatar name={display} size="sm" {...(user.avatar_url ? { src: user.avatar_url } : {})} />
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-hawk-2">
          <HawkText variant="label" ink="strong" clamp={1} className="font-medium">
            {display}
          </HawkText>
          {online && <HawkDot semantic={HawkSemantic.SUCCESS} size={6} label="Online now" />}
        </span>
        {user.handle && (
          <HawkCaption ink="muted" className="hawk-record">
            @{user.handle}
          </HawkCaption>
        )}
      </div>
    </div>
  );
}

/**
 * Contact details with their verification state attached.
 *
 * An unverified email is not the same fact as a verified one — support chasing
 * a user at an address nobody ever confirmed is a wasted afternoon — so the
 * mark sits on the value rather than in a separate column.
 */
function ContactCell({ user }: { user: UserListRow }) {
  return (
    <div className="flex min-w-0 flex-col gap-hawk-1">
      <span className="flex min-w-0 items-center gap-hawk-2">
        <HawkCaption ink="muted" className="truncate">
          {user.email}
        </HawkCaption>
        <VerifiedMark verified={user.email_verified_at !== null} />
      </span>
      {user.phone_number && (
        <span className="flex items-center gap-hawk-2">
          <HawkCaption ink="disabled" className="hawk-record">
            {user.phone_number}
          </HawkCaption>
          <VerifiedMark verified={user.phone_verified_at !== null} />
        </span>
      )}
    </div>
  );
}

function VerifiedMark({ verified }: { verified: boolean }) {
  return (
    <HawkIcon
      icon={verified ? IconVerified : IconAlertTriangle}
      size={11}
      className={cn('shrink-0', verified ? 'text-hawk-success' : 'text-hawk-caution')}
      aria-label={verified ? 'Verified' : 'Not verified'}
    />
  );
}

/**
 * Standing — rating for professionals, strikes for anyone.
 *
 * One column rather than two because the two are never both interesting: a
 * professional with strikes is a professional whose rating you stop trusting,
 * and a client has no rating at all. Strikes take precedence when present.
 */
function StandingCell({ user }: { user: UserListRow }) {
  const strikes = user.active_strikes ?? 0;
  const rating = user.rating ?? null;

  if (strikes > 0) {
    return (
      <span className="flex items-center gap-hawk-2">
        <HawkIcon icon={IconShield} size={12} className="text-hawk-critical" />
        <HawkText variant="caption" record className="font-semibold text-hawk-critical">
          {strikes} {strikes === 1 ? 'strike' : 'strikes'}
        </HawkText>
      </span>
    );
  }

  if (rating === null) {
    return <HawkCaption ink="disabled">—</HawkCaption>;
  }

  return (
    <span className="flex items-center gap-hawk-2">
      <HawkIcon icon={IconStar} size={12} className="text-hawk-caution" />
      <HawkText variant="caption" record className="font-medium">
        {rating.toFixed(1)}
      </HawkText>
      <HawkCaption ink="disabled">({user.review_count ?? 0})</HawkCaption>
    </span>
  );
}
