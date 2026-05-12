import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppText } from '@ohlify/ui';
import { AdminKycSubmissionStatus, type AdminKycSubmission } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { FilterTabs, type FilterTabOption } from '../../../shared/parts/filter-tabs.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { ADMIN_ROUTES } from '../../../shared/routes/admin-routes.js';
import { KycStatusPill } from '../../users/parts/user-status-pill.js';
import { useKycSubmissions } from '../api/use-kyc.js';

const STATUS_TABS: FilterTabOption[] = [
  { label: 'All', value: '' },
  ...Object.values(AdminKycSubmissionStatus).map((v) => ({ label: humanizeStatus(v), value: v })),
];

export function KycListScreen() {
  const navigate = useNavigate();
  // Defaults to "All" — operator picks a triage tab when needed.
  const [status, setStatus] = useState<string>('');

  const list = useKycSubmissions({ status });

  const columns: ColumnDef<AdminKycSubmission>[] = [
    {
      key: 'user',
      header: 'User',
      width: '24%',
      render: (s) => (
        <div className="flex flex-col">
          <UserLink userId={s.user_id} idLen={18} />
          <AppText variant="bodySmall" className="text-text-muted">
            Submission {shortId(s.id, 10)}
          </AppText>
        </div>
      ),
    },
    {
      key: 'idtype',
      header: 'Identity type',
      width: '18%',
      render: (s) => humanizeStatus(s.identity_type ?? ''),
    },
    {
      key: 'idnum',
      header: 'Identity #',
      width: '18%',
      render: (s) => <code className="text-xs">{s.identity_number ?? '—'}</code>,
    },
    {
      key: 'doc',
      header: 'Document',
      width: '14%',
      render: (s) => (
        <span className="text-xs text-text-muted">
          {s.document_upload_id ? 'Uploaded' : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (s) => <KycStatusPill status={s.status} />,
    },
    {
      key: 'submitted',
      header: 'Submitted',
      width: '12%',
      render: (s) => <span className="text-text-muted">{formatRelative(s.created_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="KYC review" subtitle="Approve or reject identity submissions." />

      <FilterBar>
        <FilterTabs
          options={STATUS_TABS}
          value={status}
          onChange={setStatus}
          label="KYC status"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(s) => s.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="Empty queue"
        emptyDescription="No KYC submissions match the current filter."
        onRowClick={(s) =>
          navigate(ADMIN_ROUTES.KYC.DETAIL.build({ id: s.id }), { state: { submission: s } })
        }
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
