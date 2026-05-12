import { useState } from 'react';

import { AppButton, AppText } from '@ohlify/ui';
import { AdminWithdrawalStatus, type AdminWithdrawal } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { FilterTabs, type FilterTabOption } from '../../../shared/parts/filter-tabs.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { StatusPill, type StatusTone } from '../../../shared/parts/status-pill.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { confirm, promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { formatKobo } from '../../../shared/format/kobo.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import {
  useApproveWithdrawal,
  useForceFailWithdrawal,
  useRejectWithdrawal,
  useSyncPayouts,
  useWithdrawals,
} from '../api/use-withdrawals.js';

const TONE: Record<string, StatusTone> = {
  [AdminWithdrawalStatus.PENDING]: 'warning',
  [AdminWithdrawalStatus.PROCESSING]: 'info',
  [AdminWithdrawalStatus.COMPLETED]: 'success',
  [AdminWithdrawalStatus.FAILED]: 'danger',
  [AdminWithdrawalStatus.REVERSED]: 'muted',
};

const STATUS_TABS: FilterTabOption[] = [
  { label: 'All', value: '' },
  ...Object.values(AdminWithdrawalStatus).map((v) => ({ label: humanizeStatus(v), value: v })),
];

export function WithdrawalsListScreen() {
  const [status, setStatus] = useState<string>('');
  const [open, setOpen] = useState<AdminWithdrawal | null>(null);
  const list = useWithdrawals({ status });
  const sync = useSyncPayouts();

  const onSync = async () => {
    if (
      !(await confirm({
        title: 'Sync payouts?',
        message: 'Pulls latest transfer status from Paystack and updates local withdrawals.',
      }))
    )
      return;
    sync.mutate(undefined, {
      onSuccess: () => toastSuccess('Payouts sync queued'),
      onError: (err) => toastError(err),
    });
  };

  const columns: ColumnDef<AdminWithdrawal>[] = [
    { key: 'id', header: 'ID', width: '14%', render: (w) => shortId(w.id, 12) },
    {
      key: 'user',
      header: 'User',
      width: '20%',
      render: (w) => <UserLink userId={w.user_id} idLen={16} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '14%',
      align: 'right',
      render: (w) => (
        <span className="font-semibold text-text-primary">{formatKobo(w.amount_kobo)}</span>
      ),
    },
    {
      key: 'bank',
      header: 'Bank',
      width: '24%',
      render: (w) => (
        <div className="flex flex-col">
          <span>{w.bank_snapshot?.bank_name ?? '—'}</span>
          <span className="text-text-muted text-xs">
            {w.bank_snapshot?.account_number_last4 ??
              w.bank_snapshot?.account_number ??
              '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (w) => (
        <StatusPill label={humanizeStatus(w.status)} tone={TONE[w.status] ?? 'neutral'} />
      ),
    },
    {
      key: 'created',
      header: 'Requested',
      width: '14%',
      render: (w) => <span className="text-text-muted">{formatRelative(w.requested_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Withdrawals"
        subtitle="Approve, reject, or force-fail Paystack transfers."
        actions={
          <AppButton
            label="Sync Paystack"
            variant="outline"
            height={36}
            isLoading={sync.isPending}
            onPressed={onSync}
          />
        }
      />

      <FilterBar>
        <FilterTabs options={STATUS_TABS} value={status} onChange={setStatus} label="Withdrawal status" />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(w) => w.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No withdrawals"
        onRowClick={(w) => setOpen(w)}
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

      <WithdrawalDrawer
        item={open}
        onClose={() => setOpen(null)}
        onSettled={() => list.refetch()}
      />
    </>
  );
}

function WithdrawalDrawer({
  item,
  onClose,
  onSettled,
}: {
  item: AdminWithdrawal | null;
  onClose: () => void;
  onSettled: () => void;
}) {
  const approve = useApproveWithdrawal(item?.id ?? '');
  const reject = useRejectWithdrawal(item?.id ?? '');
  const forceFail = useForceFailWithdrawal(item?.id ?? '');

  const onApprove = async () => {
    if (!item) return;
    if (
      !(await confirm({
        title: 'Approve withdrawal?',
        message: `Initiates a Paystack transfer of ${formatKobo(item.amount_kobo)}.`,
      }))
    )
      return;
    approve.mutate(
      {},
      {
        onSuccess: () => {
          toastSuccess('Approved');
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
      title: 'Reject withdrawal',
      message: 'Funds remain in the user wallet. Provide a reason.',
    });
    if (!reason) return;
    reject.mutate(
      { reason },
      {
        onSuccess: () => {
          toastSuccess('Rejected');
          onSettled();
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const onForceFail = async () => {
    if (!item) return;
    const reason = await promptForReason({
      title: 'Force-fail withdrawal',
      message:
        'Use only when Paystack confirms the transfer will not complete. This refunds the user.',
    });
    if (!reason) return;
    forceFail.mutate(
      { reason },
      {
        onSuccess: () => {
          toastSuccess('Force-failed');
          onSettled();
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const canApproveOrReject = item?.status === AdminWithdrawalStatus.PENDING;
  const canForceFail = item?.status === AdminWithdrawalStatus.PROCESSING;

  return (
    <DetailDrawer
      open={Boolean(item)}
      onClose={onClose}
      title={item ? formatKobo(item.amount_kobo) : 'Withdrawal'}
      subtitle={item ? `User ${shortId(item.user_id, 12)}` : undefined}
      width={520}
      footer={
        item ? (
          <>
            {canForceFail && (
              <AppButton label="Force-fail" variant="outline" height={36} onPressed={onForceFail} />
            )}
            {canApproveOrReject && (
              <>
                <AppButton label="Reject" variant="outline" height={36} onPressed={onReject} />
                <AppButton label="Approve" variant="solid" height={36} onPressed={onApprove} />
              </>
            )}
          </>
        ) : null
      }
    >
      {item && (
        <>
          <DetailSection title="Withdrawal">
            <DetailRow label="ID">{shortId(item.id, 18)}</DetailRow>
            <DetailRow label="Amount">
              <AppText variant="bodyTitle">{formatKobo(item.amount_kobo)}</AppText>
            </DetailRow>
            <DetailRow label="Currency">{item.currency ?? '—'}</DetailRow>
            <DetailRow label="Status">
              <StatusPill label={humanizeStatus(item.status)} tone={TONE[item.status] ?? 'neutral'} />
            </DetailRow>
            <DetailRow label="User">
              <UserLink userId={item.user_id} idLen={18} />
            </DetailRow>
            <DetailRow label="Requested">{formatDateTime(item.requested_at)}</DetailRow>
            <DetailRow label="Processed">{formatDateTime(item.processed_at)}</DetailRow>
          </DetailSection>

          <DetailSection title="Bank account snapshot">
            <DetailRow label="Bank">{item.bank_snapshot?.bank_name ?? '—'}</DetailRow>
            <DetailRow label="Account number">
              {item.bank_snapshot?.account_number_last4 ??
                item.bank_snapshot?.account_number ??
                '—'}
            </DetailRow>
            <DetailRow label="Account name">{item.bank_snapshot?.account_name ?? '—'}</DetailRow>
            <DetailRow label="Bank code">{item.bank_snapshot?.bank_code ?? '—'}</DetailRow>
          </DetailSection>

          <DetailSection title="Paystack">
            <DetailRow label="Transfer code">{item.paystack_transfer_code ?? '—'}</DetailRow>
            <DetailRow label="Failure reason">{item.failure_reason ?? '—'}</DetailRow>
          </DetailSection>
        </>
      )}
    </DetailDrawer>
  );
}
