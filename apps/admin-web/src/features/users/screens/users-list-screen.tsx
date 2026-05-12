import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppDropdownInput, AppText } from '@ohlify/ui';
import { AdminKycStatus, AdminUserRole, AdminUserStatus, type AdminUserListItem } from '@ohlify/api';

import { Avatar } from '../../../shared/parts/avatar.js';
import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { SearchInput } from '../../../shared/parts/search-input.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus } from '../../../shared/lib/labels.js';
import { ADMIN_ROUTES } from '../../../shared/routes/admin-routes.js';
import { useAdminUsers } from '../api/use-users.js';
import { KycStatusPill, UserStatusPill } from '../parts/user-status-pill.js';

const STATUS_OPTIONS = [
  { label: 'Any status', value: '' },
  ...Object.values(AdminUserStatus)
    .filter((s) => s !== AdminUserStatus.DELETED)
    .map((v) => ({ label: humanizeStatus(v), value: v })),
];
const ROLE_OPTIONS = [
  { label: 'Any role', value: '' },
  ...Object.values(AdminUserRole).map((v) => ({ label: humanizeStatus(v), value: v })),
];
const KYC_OPTIONS = [
  { label: 'Any KYC', value: '' },
  ...Object.values(AdminKycStatus).map((v) => ({ label: humanizeStatus(v), value: v })),
];

export function UsersListScreen() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [kycStatus, setKycStatus] = useState('');

  const list = useAdminUsers({ q, status, role, kyc_status: kycStatus });

  const columns: ColumnDef<AdminUserListItem>[] = [
    {
      key: 'name',
      header: 'User',
      width: '32%',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar fileKey={u.avatar_url} name={u.full_name ?? u.email} size={32} />
          <div className="min-w-0">
            <AppText variant="body" className="truncate font-semibold text-text-primary">
              {u.full_name ?? u.handle ?? '—'}
            </AppText>
            <AppText variant="bodySmall" className="truncate text-text-muted">
              {u.email ?? '—'}
            </AppText>
          </div>
        </div>
      ),
    },
    { key: 'handle', header: 'Handle', width: '14%', render: (u) => u.handle ?? '—' },
    {
      key: 'role',
      header: 'Role',
      width: '12%',
      render: (u) => (u.role ? humanizeStatus(u.role) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (u) => <UserStatusPill status={u.status} />,
    },
    {
      key: 'kyc',
      header: 'KYC',
      width: '14%',
      render: (u) => <KycStatusPill status={u.kyc_status} />,
    },
    {
      key: 'last',
      header: 'Last seen',
      width: '16%',
      render: (u) => <span className="text-text-muted">{formatRelative(u.last_seen_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Users" subtitle="Search, inspect, suspend, block, or impersonate." />

      <FilterBar>
        <div className="sm:w-72">
          <SearchInput
            value={q}
            onDebouncedChange={setQ}
            placeholder="Search email, name, handle…"
          />
        </div>
        <div className="sm:w-44">
          <AppDropdownInput
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
          />
        </div>
        <div className="sm:w-40">
          <AppDropdownInput label="Role" options={ROLE_OPTIONS} value={role} onChange={setRole} />
        </div>
        <div className="sm:w-48">
          <AppDropdownInput
            label="KYC"
            options={KYC_OPTIONS}
            value={kycStatus}
            onChange={setKycStatus}
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(u) => u.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No users match"
        emptyDescription="Try clearing the filters."
        onRowClick={(u) => navigate(ADMIN_ROUTES.USERS.DETAIL.build({ id: u.id }))}
        footer={
          <CursorPagination
            hasPrev={list.hasPrev}
            hasNext={list.hasNext}
            onPrev={list.goPrev}
            onNext={list.goNext}
            itemCount={list.items.length}
          />
        }
      />
    </>
  );
}
