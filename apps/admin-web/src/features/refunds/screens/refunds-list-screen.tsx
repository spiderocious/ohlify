import { useState } from 'react';

import { AppButton, AppText } from '@ohlify/ui';
import { AdminRefundStatus, type AdminRefundRequest } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { FilterTabs, type FilterTabOption } from '../../../shared/parts/filter-tabs.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { StatusPill, type StatusTone } from '../../../shared/parts/status-pill.js';
import { confirm, promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { formatKobo } from '../../../shared/format/kobo.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useApproveRefund, useRefunds, useRejectRefund } from '../api/use-refunds.js';

const TONE: Record<string, StatusTone> = {
  [AdminRefundStatus.PENDING]: 'warning',
  [AdminRefundStatus.APPROVED]: 'success',
  [AdminRefundStatus.AUTO_APPROVED]: 'success',
  [AdminRefundStatus.REJECTED]: 'danger',
};

const STATUS_TABS: FilterTabOption[] = [
  { label: 'All', value: '' },
  ...Object.values(AdminRefundStatus).map((v) => ({ label: humanizeStatus(v), value: v })),
];

export function RefundsListScreen() {
  const [status, setStatus] = useState<string>('');
  const [open, setOpen] = useState<AdminRefundRequest | null>(null);
  const list = useRefunds({ status });

  const columns: ColumnDef<AdminRefundRequest>[] = [
    { key: 'id', header: 'ID', width: '14%', render: (r) => shortId(r.id, 12) },
    {
      key: 'reason',
      header: 'Reason',
      width: '36%',
      render: (r) => (
        <div className="flex flex-col">
          <AppText variant="body" className="font-semibold text-text-primary">
            {humanizeStatus(r.reason_code ?? '')}
          </AppText>
          {r.description && (
            <AppText variant="bodySmall" className="line-clamp-1 text-text-muted">
              {r.description}
            </AppText>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '14%',
      align: 'right',
      render: (r) => (
        <span className="font-semibold tabular-nums">{formatKobo(r.requested_amount_kobo)}</span>
      ),
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
      <PageHeader title="Refunds" subtitle="Approve or reject user refund requests." />

      <FilterBar>
        <FilterTabs options={STATUS_TABS} value={status} onChange={setStatus} label="Refund status" />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No refunds"
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

      <RefundDrawer item={open} onClose={() => setOpen(null)} onSettled={() => list.refetch()} />
    </>
  );
}

function RefundDrawer({
  item,
  onClose,
  onSettled,
}: {
  item: AdminRefundRequest | null;
  onClose: () => void;
  onSettled: () => void;
}) {
  const approve = useApproveRefund(item?.id ?? '');
  const reject = useRejectRefund(item?.id ?? '');

  const onApprove = async () => {
    if (!item) return;
    if (
      !(await confirm({
        title: 'Approve refund?',
        message: `Refunds ${formatKobo(item.requested_amount_kobo)} to the user wallet immediately.`,
      }))
    )
      return;
    approve.mutate(
      {},
      {
        onSuccess: () => {
          toastSuccess('Refund approved');
          onSettled();
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const onReject = async () => {
    if (!item) return;
    const reason = await promptForReason({
      title: 'Reject refund',
      message: 'The user will see this note.',
    });
    if (!reason) return;
    reject.mutate(
      { note: reason },
      {
        onSuccess: () => {
          toastSuccess('Refund rejected');
          onSettled();
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const canAct = item?.status === AdminRefundStatus.PENDING;

  return (
    <DetailDrawer
      open={Boolean(item)}
      onClose={onClose}
      title={item ? `Refund of ${formatKobo(item.requested_amount_kobo)}` : 'Refund'}
      subtitle={item ? humanizeStatus(item.reason_code) : undefined}
      width={520}
      footer={
        item && canAct ? (
          <>
            <AppButton label="Reject" variant="outline" height={36} onPressed={onReject} />
            <AppButton label="Approve" variant="solid" height={36} onPressed={onApprove} />
          </>
        ) : null
      }
    >
      {item && (
        <>
          <DetailSection title="Request">
            <DetailRow label="ID">{shortId(item.id, 18)}</DetailRow>
            <DetailRow label="Amount">
              <AppText variant="bodyTitle">{formatKobo(item.requested_amount_kobo)}</AppText>
            </DetailRow>
            <DetailRow label="Status">
              <StatusPill label={humanizeStatus(item.status)} tone={TONE[item.status] ?? 'neutral'} />
            </DetailRow>
            <DetailRow label="Reason code">{humanizeStatus(item.reason_code ?? '')}</DetailRow>
            <DetailRow label="Description">
              <span className="whitespace-pre-wrap">{item.description ?? '—'}</span>
            </DetailRow>
            <DetailRow label="Target journal">{shortId(item.target_journal_id, 18)}</DetailRow>
            <DetailRow label="Refund journal">{shortId(item.refund_journal_id, 18)}</DetailRow>
            <DetailRow label="Related call">{shortId(item.related_call_id, 18)}</DetailRow>
            <DetailRow label="Created">{formatDateTime(item.created_at)}</DetailRow>
            <DetailRow label="Reviewed">{formatDateTime(item.reviewed_at)}</DetailRow>
            <DetailRow label="Review note">{item.review_note ?? '—'}</DetailRow>
          </DetailSection>
        </>
      )}
    </DetailDrawer>
  );
}
