import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AdminKycSubmissionStatus, type AdminKycSubmission } from '@ohlify/api';
import {
  HawkCaption,
  HawkStatusBadge,
  HawkText,
  IconIdCard,
  IconClock,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { statusFor } from '../../../shared/parts/board-status.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { ADMIN_ROUTES } from '../../../shared/routes/admin-routes.js';
import { useKycSubmissions } from '../api/use-kyc.js';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: AdminKycSubmissionStatus.PENDING_REVIEW, label: 'Awaiting review' },
  { value: AdminKycSubmissionStatus.APPROVED, label: 'Approved' },
  { value: AdminKycSubmissionStatus.REJECTED, label: 'Rejected' },
];

/**
 * The KYC queue.
 *
 * This gate decides whether someone can earn at all, so the queue is ordered
 * around *waiting*: the oldest submission is the one costing someone money,
 * and the age column is the reason to open a row rather than the id.
 *
 * Defaults to the review tab rather than "All" — an operator opening this
 * screen is here to clear the queue, not to browse approved history.
 */
export function KycListScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>(AdminKycSubmissionStatus.PENDING_REVIEW);

  const list = useKycSubmissions({ status });

  const waiting = list.items.filter(
    (row) => row.status === AdminKycSubmissionStatus.PENDING_REVIEW,
  );
  const oldest = waiting.reduce<string | null>(
    (acc, row) => (acc === null || row.created_at < acc ? row.created_at : acc),
    null,
  );

  const kpis: HawkKpi[] = [
    {
      key: 'waiting',
      label: 'Awaiting review',
      value: waiting.length.toLocaleString(),
      icon: IconIdCard,
      semantic: waiting.length > 0 ? 'caution' : 'success',
    },
    {
      key: 'oldest',
      label: 'Oldest waiting',
      // The age is the metric, not the count: one submission stuck three weeks
      // matters more than ten that arrived this morning.
      value: oldest ? formatRelative(oldest) : '—',
      icon: IconClock,
      semantic: 'caution',
    },
    {
      key: 'shown',
      label: 'Rows shown',
      value: list.items.length.toLocaleString(),
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminKycSubmission>> = [
    {
      key: 'user',
      header: 'User',
      width: '26%',
      render: (row) => (
        <div className="flex flex-col">
          <UserLink userId={row.user_id} idLen={18} />
          <HawkCaption ink="muted" className="hawk-record">
            {shortId(row.id, 12)}
          </HawkCaption>
        </div>
      ),
    },
    {
      key: 'idtype',
      header: 'Identity',
      width: '16%',
      render: (row) => (
        <div className="flex flex-col">
          <HawkText variant="label">{humanizeStatus(row.identity_type ?? '')}</HawkText>
          <HawkCaption ink="muted" className="hawk-record">
            {row.identity_number ?? '—'}
          </HawkCaption>
        </div>
      ),
    },
    {
      key: 'documents',
      header: 'Documents',
      width: '16%',
      // Whether there is anything to look at decides whether the row can be
      // actioned at all — a submission with no document cannot be approved.
      render: (row) => {
        const has = [row.document_upload_id, row.selfie_upload_key].filter(Boolean).length;
        if (has === 2) return <HawkCaption>Document + selfie</HawkCaption>;
        if (has === 1) return <HawkCaption className="text-hawk-caution">Incomplete</HawkCaption>;
        return <HawkCaption className="text-hawk-critical">Missing</HawkCaption>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '16%',
      render: (row) => <HawkStatusBadge status={statusFor('kyc', row.status)} size="sm" />,
    },
    {
      key: 'submitted',
      header: 'Waiting',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{formatRelative(row.created_at)}</span>
      ),
    },
  ];

  return (
    <BoardScreen
      title="KYC review"
      subtitle={
        waiting.length > 0
          ? `${waiting.length} awaiting review · oldest ${oldest ? formatRelative(oldest) : '—'}`
          : 'Approve or reject identity submissions.'
      }
      kpis={kpis}
      tabs={STATUS_TABS}
      activeTab={status}
      onTabChange={setStatus}
      columns={columns}
      list={list}
      rowKey={(row) => row.id}
      onRowClick={(row) =>
        navigate(ADMIN_ROUTES.KYC.DETAIL.build({ id: row.id }), {
          state: { submission: row },
        })
      }
      emptyTitle="Queue clear"
      emptyDescription="No submissions match this filter."
    />
  );
}
