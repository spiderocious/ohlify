import { useState } from 'react';

import { AdminRefundStatus, type AdminRefundRequest } from '@ohlify/api';
import {
  HawkButton,
  HawkCallout,
  HawkCaption,
  HawkDetailDrawer,
  HawkDrawer,
  HawkKeyValue,
  HawkSemantic,
  HawkStatusBadge,
  HawkText,
  IconReceipt,
  formatKobo,
  formatKoboCompact,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { statusFor, statusTabs } from '../../../shared/parts/board-status.js';
import { promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useApproveRefund, useRefunds, useRejectRefund } from '../api/use-refunds.js';

/**
 * The refund queue.
 *
 * A refund reverses a settled call, so approving one is a money-moving act
 * with the same weight as a withdrawal — hence the typed confirm. What differs
 * is the reading: a withdrawal is judged on *who* is being paid, a refund on
 * *why*, so the reason leads the row rather than the amount.
 */
export function RefundsListScreen() {
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<AdminRefundRequest | null>(null);

  const list = useRefunds({ status });

  const pending = list.items.filter((row) => row.status === AdminRefundStatus.PENDING);
  const pendingTotal = pending.reduce((sum, row) => sum + Number(row.requested_amount_kobo), 0);

  const kpis: HawkKpi[] = [
    {
      key: 'pending',
      label: 'Awaiting decision',
      value: pending.length.toLocaleString(),
      icon: IconReceipt,
      semantic: pending.length > 0 ? 'caution' : 'neutral',
    },
    {
      key: 'value',
      label: 'Value requested',
      valueKobo: pendingTotal,
      icon: IconReceipt,
      basis: 'gross',
    },
    {
      key: 'shown',
      label: 'Rows shown',
      value: list.items.length.toLocaleString(),
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminRefundRequest>> = [
    {
      key: 'reason',
      header: 'Reason',
      width: '34%',
      // The reason leads: a refund is judged on why it was asked for, and an
      // operator scanning this queue is reading for the story, not the id.
      render: (row) => (
        <div className="flex flex-col">
          <HawkText variant="label" ink="strong" className="font-medium">
            {humanizeStatus(row.reason_code ?? '')}
          </HawkText>
          {row.description && (
            <HawkCaption ink="muted" clamp={1}>
              {row.description}
            </HawkCaption>
          )}
        </div>
      ),
    },
    {
      key: 'id',
      header: 'Request',
      width: '14%',
      render: (row) => <span className="hawk-record">{shortId(row.id, 12)}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: '14%',
      render: (row) => (
        <span className="hawk-record font-semibold">
          {formatKobo(row.requested_amount_kobo)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (row) => <HawkStatusBadge status={statusFor('refund', row.status)} size="sm" />,
    },
    {
      key: 'created',
      header: 'Requested',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{formatRelative(row.created_at)}</span>
      ),
    },
  ];

  return (
    <>
      <BoardScreen
        title="Refunds"
        subtitle={
          pending.length > 0
            ? `${pending.length} awaiting a decision · ${formatKoboCompact(pendingTotal)} requested`
            : 'Approve or reject user refund requests.'
        }
        kpis={kpis}
        tabs={statusTabs('refund')}
        activeTab={status}
        onTabChange={setStatus}
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        onRowClick={setOpen}
        emptyTitle="No refunds"
        emptyDescription="Nothing matches this status filter."
      />

      <RefundDrawer
        item={open}
        onClose={() => setOpen(null)}
        onSettled={() => list.refetch()}
      />
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
  const isPending = item?.status === AdminRefundStatus.PENDING;

  const onApprove = async () => {
    if (!item) return;
    // Approving a refund posts a reversing journal — money moves, and the
    // entry is append-only, so there is no undo.
    const ok = await HawkDrawer.typedConfirm({
      title: 'Approve this refund?',
      message: `${formatKobo(
        item.requested_amount_kobo,
      )} will be returned to the client and reversed off the professional's earnings. The ledger entry cannot be undone.`,
      phrase: 'REFUND',
    });
    if (!ok) return;
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
    const reason = await promptForReason({
      title: 'Reject refund',
      message: 'The requester sees this. Say why the refund was not granted.',
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

  return (
    <HawkDetailDrawer.Root
      open={item !== null}
      onClose={onClose}
      title={item ? humanizeStatus(item.reason_code ?? 'Refund') : 'Refund'}
      subtitle={item ? formatKobo(item.requested_amount_kobo) : undefined}
      actions={
        item && isPending ? (
          <div className="flex w-full items-center justify-end gap-hawk-3">
            <HawkButton
              label="Reject"
              variant="outline"
              loading={reject.isPending}
              onClick={() => void onReject()}
            />
            <HawkButton
              label="Approve"
              loading={approve.isPending}
              onClick={() => void onApprove()}
            />
          </div>
        ) : null
      }
    >
      {item && (
        <div className="flex flex-col gap-hawk-6">
          {item.description && (
            <div className="flex flex-col gap-hawk-2">
              <HawkCaption ink="muted">What the requester said</HawkCaption>
              <HawkText variant="caption" className="leading-relaxed">
                {item.description}
              </HawkText>
            </div>
          )}

          <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
            <HawkKeyValue label="Request" value={shortId(item.id, 20)} record />
            <HawkKeyValue
              label="Amount"
              value={formatKobo(item.requested_amount_kobo)}
              record
            />
            <HawkKeyValue
              label="Status"
              value={<HawkStatusBadge status={statusFor('refund', item.status)} size="sm" />}
            />
            <HawkKeyValue
              label="Reason code"
              value={humanizeStatus(item.reason_code ?? '')}
              record
            />
            <HawkKeyValue label="Related call" value={item.related_call_id ?? '—'} record />
            <HawkKeyValue label="Target journal" value={item.target_journal_id ?? '—'} record />
            <HawkKeyValue label="Refund journal" value={item.refund_journal_id ?? '—'} record />
            <HawkKeyValue label="Requested" value={formatDateTime(item.created_at)} record />
            <HawkKeyValue label="Reviewed" value={formatDateTime(item.reviewed_at)} record />
          </div>

          {item.review_note && (
            <HawkCallout
              semantic={
                item.status === AdminRefundStatus.REJECTED
                  ? HawkSemantic.CAUTION
                  : HawkSemantic.INFO
              }
              title="Review note"
              message={item.review_note}
            />
          )}
        </div>
      )}
    </HawkDetailDrawer.Root>
  );
}
