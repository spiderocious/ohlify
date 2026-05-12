import { useState } from 'react';

import { AppButton, AppText, AppTextInput } from '@ohlify/ui';
import { AdminReportStatus, type AdminReport } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { FilterTabs, type FilterTabOption } from '../../../shared/parts/filter-tabs.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { StatusPill, type StatusTone } from '../../../shared/parts/status-pill.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useDismissReport, useReports, useResolveReport } from '../api/use-reports.js';

const TONE: Record<string, StatusTone> = {
  [AdminReportStatus.PENDING]: 'warning',
  [AdminReportStatus.RESOLVED]: 'success',
  [AdminReportStatus.DISMISSED]: 'muted',
};
const STATUS_TABS: FilterTabOption[] = [
  { label: 'All', value: '' },
  ...Object.values(AdminReportStatus).map((v) => ({ label: humanizeStatus(v), value: v })),
];

function isUserTarget(t: string): boolean {
  return t === 'profile' || t === 'user';
}

export function ReportsListScreen() {
  const [status, setStatus] = useState<string>('');
  const [targetType, setTargetType] = useState('');
  const [open, setOpen] = useState<AdminReport | null>(null);
  const list = useReports({ status, target_type: targetType });

  const columns: ColumnDef<AdminReport>[] = [
    {
      key: 'reporter',
      header: 'Reporter',
      width: '20%',
      render: (r) => <UserLink userId={r.reporter_user_id} idLen={16} />,
    },
    {
      key: 'target',
      header: 'Target',
      width: '24%',
      render: (r) => (
        <div className="flex flex-col">
          <AppText variant="body" className="text-text-primary">
            {humanizeStatus(r.target_type)}
          </AppText>
          {isUserTarget(r.target_type) ? (
            <UserLink userId={r.target_id} idLen={16} />
          ) : (
            <code className="text-[10px] text-text-muted">{shortId(r.target_id, 16)}</code>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      width: '20%',
      render: (r) => humanizeStatus(r.reason_code),
    },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (r) => (
        <StatusPill label={humanizeStatus(r.status)} tone={TONE[r.status] ?? 'neutral'} />
      ),
    },
    {
      key: 'created',
      header: 'Created',
      width: '14%',
      render: (r) => <span className="text-text-muted">{formatRelative(r.created_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="User-submitted reports about other users, calls, or reviews."
      />

      <FilterBar>
        <FilterTabs options={STATUS_TABS} value={status} onChange={setStatus} label="Report status" />
        <div className="sm:w-48">
          <AppTextInput
            label="Target type"
            placeholder="profile, call, review…"
            value={targetType}
            onChange={setTargetType}
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No reports"
        onRowClick={(r) => setOpen(r)}
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

      <ReportDrawer item={open} onClose={() => setOpen(null)} onSettled={() => list.refetch()} />
    </>
  );
}

function ReportDrawer({
  item,
  onClose,
  onSettled,
}: {
  item: AdminReport | null;
  onClose: () => void;
  onSettled: () => void;
}) {
  const resolve = useResolveReport(item?.id ?? '');
  const dismiss = useDismissReport(item?.id ?? '');

  const onResolve = async () => {
    if (!item) return;
    const note = await promptForReason({
      title: 'Resolve report',
      message: 'Describe the action you took (will be logged).',
    });
    if (!note) return;
    resolve.mutate(
      { note },
      {
        onSuccess: () => {
          toastSuccess('Report resolved');
          onSettled();
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const onDismiss = async () => {
    if (!item) return;
    const note = await promptForReason({
      title: 'Dismiss report',
      message: 'Why is this report not actionable?',
    });
    if (!note) return;
    dismiss.mutate(
      { note },
      {
        onSuccess: () => {
          toastSuccess('Report dismissed');
          onSettled();
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const isOpen = item?.status === AdminReportStatus.PENDING;

  return (
    <DetailDrawer
      open={Boolean(item)}
      onClose={onClose}
      title={item ? `Report ${shortId(item.id, 12)}` : 'Report'}
      subtitle={item ? humanizeStatus(item.reason_code) : undefined}
      width={520}
      footer={
        item && isOpen ? (
          <>
            <AppButton label="Dismiss" variant="outline" height={36} onPressed={onDismiss} />
            <AppButton label="Resolve" variant="solid" height={36} onPressed={onResolve} />
          </>
        ) : null
      }
    >
      {item && (
        <>
          <DetailSection title="Report">
            <DetailRow label="ID">{shortId(item.id, 18)}</DetailRow>
            <DetailRow label="Reporter">
              <UserLink userId={item.reporter_user_id} idLen={18} />
            </DetailRow>
            <DetailRow label="Target">
              <div className="flex items-center gap-2">
                <span>{humanizeStatus(item.target_type)}</span>
                {isUserTarget(item.target_type) ? (
                  <UserLink userId={item.target_id} idLen={18} />
                ) : (
                  <code className="text-xs">{shortId(item.target_id, 18)}</code>
                )}
              </div>
            </DetailRow>
            <DetailRow label="Reason">{humanizeStatus(item.reason_code)}</DetailRow>
            <DetailRow label="Status">
              <StatusPill label={humanizeStatus(item.status)} tone={TONE[item.status] ?? 'neutral'} />
            </DetailRow>
            <DetailRow label="Description">
              <span className="whitespace-pre-wrap">{item.description ?? '—'}</span>
            </DetailRow>
            <DetailRow label="Created">{formatDateTime(item.created_at)}</DetailRow>
          </DetailSection>

          <DetailSection title="Review">
            <DetailRow label="Reviewed by">
              {item.reviewed_by ? <UserLink userId={item.reviewed_by} idLen={18} /> : '—'}
            </DetailRow>
            <DetailRow label="Reviewed at">{formatDateTime(item.reviewed_at)}</DetailRow>
            <DetailRow label="Note">
              <span className="whitespace-pre-wrap">{item.review_note ?? '—'}</span>
            </DetailRow>
          </DetailSection>
        </>
      )}
    </DetailDrawer>
  );
}
