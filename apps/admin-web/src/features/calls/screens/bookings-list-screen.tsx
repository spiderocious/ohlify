import { useState } from 'react';

import { AdminBookingStatus, type AdminBooking } from '@ohlify/api';
import {
  HawkBadge,
  HawkCaption,
  HawkSemantic,
  HawkStatusBadge,
  IconCalendar,
  IconReceipt,
  formatKobo,
  formatKoboCompact,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { statusFor, statusTabs } from '../../../shared/parts/board-status.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useAdminBookings } from '../api/use-calls.js';

/**
 * The bookings board.
 *
 * Distinct from calls: a booking is the *commitment*, a call is what happened.
 * Money is attached to the booking, so the amount paid sits here rather than
 * on the call board — and a booking stuck in `pending_payment` is the row that
 * matters, because it is a slot held against money that never arrived.
 */
export function BookingsListScreen() {
  const [status, setStatus] = useState('');

  const list = useAdminBookings({ status });

  const unpaid = list.items.filter((row) => row.status === AdminBookingStatus.PENDING).length;
  const pageValue = list.items.reduce((sum, row) => sum + Number(row.total_paid_kobo), 0);

  const kpis: HawkKpi[] = [
    {
      key: 'unpaid',
      label: 'Awaiting payment',
      value: unpaid.toLocaleString(),
      icon: IconCalendar,
      // A slot held against money that never arrived — the only urgent state
      // on this board.
      semantic: unpaid > 0 ? 'caution' : 'neutral',
    },
    {
      key: 'value',
      label: 'Paid on this page',
      valueKobo: pageValue,
      icon: IconReceipt,
      basis: 'gross',
    },
    {
      key: 'shown',
      label: 'Rows shown',
      value: list.items.length.toLocaleString(),
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminBooking>> = [
    {
      key: 'id',
      header: 'Booking',
      width: '13%',
      render: (row) => <span className="hawk-record">{shortId(row.id, 12)}</span>,
    },
    {
      key: 'parties',
      header: 'Parties',
      width: '28%',
      render: (row) => (
        <div className="flex flex-col">
          <span className="flex items-center gap-hawk-2">
            <HawkCaption ink="disabled">caller</HawkCaption>
            <UserLink userId={row.caller_user_id} idLen={16} />
          </span>
          <span className="flex items-center gap-hawk-2">
            <HawkCaption ink="disabled">callee</HawkCaption>
            <UserLink userId={row.callee_user_id} idLen={16} />
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '10%',
      render: (row) => (
        <HawkBadge
          label={humanizeStatus(row.call_type)}
          semantic={HawkSemantic.NEUTRAL}
          size="sm"
        />
      ),
    },
    {
      key: 'dur',
      header: 'Booked',
      align: 'right',
      width: '9%',
      render: (row) => <span className="hawk-record">{row.duration_minutes}m</span>,
    },
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      width: '13%',
      render: (row) => (
        <span className="hawk-record font-semibold">{formatKobo(row.total_paid_kobo)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '15%',
      render: (row) => <HawkStatusBadge status={statusFor('booking', row.status)} size="sm" />,
    },
    {
      key: 'sched',
      header: 'Scheduled',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{formatRelative(row.start_at)}</span>
      ),
    },
  ];

  return (
    <BoardScreen
      title="Bookings"
      subtitle={
        unpaid > 0
          ? `${unpaid} awaiting payment · ${formatKoboCompact(pageValue)} paid on this page`
          : 'Confirmed, cancelled and completed booking records.'
      }
      kpis={kpis}
      tabs={statusTabs('booking')}
      activeTab={status}
      onTabChange={setStatus}
      columns={columns}
      list={list}
      rowKey={(row) => row.id}
      emptyTitle="No bookings"
      emptyDescription="Nothing matches this status filter."
    />
  );
}
