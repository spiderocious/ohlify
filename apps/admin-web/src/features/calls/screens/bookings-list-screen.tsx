import { useState } from 'react';

import { AppDropdownInput, AppText } from '@ohlify/ui';
import { AdminBookingStatus, type AdminBooking } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { formatKobo } from '../../../shared/format/kobo.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useAdminBookings } from '../api/use-calls.js';
import { BookingStatusPill } from '../parts/call-status-pill.js';

const STATUS_OPTIONS = [
  { label: 'Any', value: '' },
  ...Object.values(AdminBookingStatus).map((v) => ({ label: humanizeStatus(v), value: v })),
];

export function BookingsListScreen() {
  const [status, setStatus] = useState('');
  const list = useAdminBookings({ status });

  const columns: ColumnDef<AdminBooking>[] = [
    { key: 'id', header: 'Booking', width: '14%', render: (b) => shortId(b.id, 12) },
    {
      key: 'parties',
      header: 'Parties',
      width: '32%',
      render: (b) => (
        <div className="flex flex-col">
          <AppText variant="bodySmall">
            <span className="text-text-muted">caller →</span>{' '}
            <UserLink userId={b.caller_user_id} idLen={16} />
          </AppText>
          <AppText variant="bodySmall">
            <span className="text-text-muted">callee →</span>{' '}
            <UserLink userId={b.callee_user_id} idLen={16} />
          </AppText>
        </div>
      ),
    },
    { key: 'type', header: 'Type', width: '8%', render: (b) => humanizeStatus(b.call_type) },
    { key: 'dur', header: 'Booked', width: '10%', render: (b) => `${b.duration_minutes}m` },
    {
      key: 'paid',
      header: 'Paid',
      width: '12%',
      align: 'right',
      render: (b) => (
        <span className="font-semibold tabular-nums">{formatKobo(b.total_paid_kobo)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (b) => <BookingStatusPill status={b.status} />,
    },
    {
      key: 'sched',
      header: 'Scheduled',
      width: '12%',
      render: (b) => <span className="text-text-muted">{formatRelative(b.start_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Bookings" subtitle="Confirmed/cancelled/completed booking records." />

      <FilterBar>
        <div className="w-44">
          <AppDropdownInput
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(b) => b.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No bookings"
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
