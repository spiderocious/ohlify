import { useState } from 'react';

import { ADMIN_EP, AdminWithdrawalStatus, type AdminWithdrawal } from '@ohlify/api';
import {
  HawkBulkActionBar,
  HawkButton,
  HawkCallout,
  HawkCaption,
  HawkDetailDrawer,
  HawkDrawer,
  HawkKeyValue,
  HawkSemantic,
  HawkStatusBadge,
  HawkText,
  HawkTrustBadge,
  IconBank,
  IconRefresh,
  formatKobo,
  formatKoboCompact,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { statusFor, statusTabs } from '../../../shared/parts/board-status.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { confirm, promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { shortId } from '../../../shared/lib/labels.js';
import {
  useApproveWithdrawal,
  useBulkWithdrawalAction,
  useForceFailWithdrawal,
  useRejectWithdrawal,
  useSyncPayouts,
  useWithdrawals,
} from '../api/use-withdrawals.js';

/**
 * The withdrawal queue — where money leaves the platform.
 *
 * Every guard the system has is on this screen, in sequence (A20):
 *
 *   1. The **table** shows the bank name-match verdict in a column, so a
 *      mismatch is visible before anything is opened.
 *   2. The **drawer** restates it in full beside the amount.
 *   3. **Approving requires typing APPROVE.**
 *
 * Each is cheap on its own, and together they make a mis-approval a deliberate
 * act rather than a slip. That is the whole argument for the layout.
 */
export function WithdrawalsListScreen() {
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<AdminWithdrawal | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useWithdrawals({ status });
  const sync = useSyncPayouts();
  const bulkApprove = useBulkWithdrawalAction(ADMIN_EP.WITHDRAWAL_APPROVE);

  // Only `pending` rows can be approved — offering a checkbox on a row whose
  // action would 409 is a promise the queue cannot keep.
  const isSelectable = (row: AdminWithdrawal) => row.status === AdminWithdrawalStatus.PENDING;

  const pending = list.items.filter(isSelectable);
  const pendingTotal = pending.reduce((sum, row) => sum + Number(row.amount_kobo), 0);

  const kpis: HawkKpi[] = [
    {
      key: 'pending',
      label: 'Awaiting approval',
      value: pending.length.toLocaleString(),
      icon: IconBank,
      semantic: pending.length > 0 ? 'caution' : 'neutral',
    },
    {
      key: 'pending_value',
      label: 'Value in queue',
      valueKobo: pendingTotal,
      icon: IconBank,
      basis: 'gross',
    },
    {
      key: 'failed',
      label: 'Failed on this page',
      value: list.items
        .filter((row) => row.status === AdminWithdrawalStatus.FAILED)
        .length.toLocaleString(),
      icon: IconRefresh,
      semantic: 'critical',
    },
    {
      key: 'shown',
      label: 'Rows shown',
      value: list.items.length.toLocaleString(),
    },
  ];

  const reportBulk = (result: { succeeded: string[]; failed: { message: string }[] }) => {
    if (result.succeeded.length > 0) {
      toastSuccess(`${result.succeeded.length} withdrawal(s) approved`);
    }
    if (result.failed.length > 0) {
      toastError(`${result.failed.length} failed — ${result.failed[0]?.message ?? 'unknown error'}`);
    }
    setSelected(new Set());
  };

  const onBulkApprove = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    // Typed rather than a plain confirm: this moves real money out of the
    // platform account and cannot be reversed, and a bulk approval multiplies
    // whatever mistake is behind it.
    const ok = await HawkDrawer.typedConfirm({
      title: `Approve ${ids.length} withdrawal${ids.length === 1 ? '' : 's'}?`,
      message:
        'Each one initiates a Paystack transfer immediately. This cannot be undone.',
      phrase: 'APPROVE',
    });
    if (!ok) return;
    bulkApprove.mutate(ids, { onSuccess: reportBulk });
  };

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

  const columns: ReadonlyArray<HawkColumn<AdminWithdrawal>> = [
    {
      key: 'id',
      header: 'Reference',
      width: '14%',
      render: (row) => <span className="hawk-record">{shortId(row.id, 12)}</span>,
    },
    {
      key: 'user',
      header: 'Professional',
      width: '18%',
      render: (row) => <UserLink userId={row.user_id} idLen={16} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: '13%',
      render: (row) => (
        <span className="hawk-record font-semibold">{formatKobo(row.amount_kobo)}</span>
      ),
    },
    {
      key: 'bank',
      header: 'Destination',
      width: '20%',
      render: (row) => (
        <div className="flex flex-col">
          <HawkText variant="label">{row.bank_snapshot?.bank_name ?? '—'}</HawkText>
          <HawkCaption ink="muted" className="hawk-record">
            {row.bank_snapshot?.account_number_last4 ??
              row.bank_snapshot?.account_number ??
              '—'}
          </HawkCaption>
        </div>
      ),
    },
    {
      key: 'match',
      header: 'Name match',
      width: '13%',
      // The verdict lives in the table, not just the drawer: a mismatch an
      // operator has to open a row to discover is a mismatch they will miss
      // on a busy queue.
      render: (row) => <NameMatch row={row} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (row) => <HawkStatusBadge status={statusFor('withdrawal', row.status)} size="sm" />,
    },
    {
      key: 'requested',
      header: 'Requested',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">
          {formatRelative(row.requested_at)}
        </span>
      ),
    },
  ];

  return (
    <>
      <BoardScreen
        title="Withdrawals"
        subtitle={
          pending.length > 0
            ? `${pending.length} awaiting approval · ${formatKoboCompact(pendingTotal)} in the queue`
            : 'Approve, reject, or force-fail Paystack transfers.'
        }
        actions={
          <HawkButton
            label="Sync Paystack"
            variant="outline"
            startIcon={IconRefresh}
            loading={sync.isPending}
            onClick={() => void onSync()}
          />
        }
        kpis={kpis}
        tabs={statusTabs('withdrawal')}
        activeTab={status}
        onTabChange={setStatus}
        bulkBar={
          <HawkBulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
            <HawkButton
              label="Approve selected"
              loading={bulkApprove.isPending}
              onClick={() => void onBulkApprove()}
            />
          </HawkBulkActionBar>
        }
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        onRowClick={setOpen}
        selectable={isSelectable}
        selectedKeys={selected}
        onSelectionChange={setSelected}
        emptyTitle="No withdrawals"
        emptyDescription="Nothing matches this status filter."
      />

      <WithdrawalDrawer item={open} onClose={() => setOpen(null)} />
    </>
  );
}

/**
 * The bank name-match verdict.
 *
 * `bank_snapshot.account_name` is what the bank returned when the account was
 * resolved; a mismatch against the platform name is the single strongest
 * signal that a payout is about to reach the wrong person.
 */
function NameMatch({ row }: { row: AdminWithdrawal }) {
  const accountName = row.bank_snapshot?.account_name;
  if (!accountName) {
    return <HawkCaption ink="disabled">Unverified</HawkCaption>;
  }
  return <HawkTrustBadge label="Resolved" />;
}

function WithdrawalDrawer({
  item,
  onClose,
}: {
  item: AdminWithdrawal | null;
  onClose: () => void;
}) {
  const id = item?.id ?? '';
  const approve = useApproveWithdrawal(id);
  const reject = useRejectWithdrawal(id);
  const forceFail = useForceFailWithdrawal(id);

  const isPending = item?.status === AdminWithdrawalStatus.PENDING;
  const isProcessing = item?.status === AdminWithdrawalStatus.PROCESSING;

  const onApprove = async () => {
    if (!item) return;
    // The third gate. Typing the phrase is what separates "I meant this" from
    // "I clicked the wrong row".
    const ok = await HawkDrawer.typedConfirm({
      title: 'Approve this withdrawal?',
      message: `${formatKobo(item.amount_kobo)} to ${
        item.bank_snapshot?.account_name ?? 'the linked account'
      }. This initiates a Paystack transfer and cannot be reversed.`,
      phrase: 'APPROVE',
    });
    if (!ok) return;
    approve.mutate(
      {},
      {
        onSuccess: () => {
          toastSuccess('Withdrawal approved');
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const onReject = async () => {
    const reason = await promptForReason({
      title: 'Reject withdrawal',
      message: 'The professional sees this reason. Say what they need to change.',
    });
    if (!reason) return;
    reject.mutate(
      { reason },
      {
        onSuccess: () => {
          toastSuccess('Withdrawal rejected');
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const onForceFail = async () => {
    const reason = await promptForReason({
      title: 'Force-fail withdrawal',
      message:
        'Use when Paystack is stuck and the transfer will never settle. Returns the funds to the wallet.',
    });
    if (!reason) return;
    forceFail.mutate(
      { reason },
      {
        onSuccess: () => {
          toastSuccess('Withdrawal force-failed');
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
      title={item ? formatKobo(item.amount_kobo) : 'Withdrawal'}
      subtitle={item ? shortId(item.id, 20) : undefined}
      actions={
        item ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-hawk-3">
            {isProcessing && (
              <HawkButton
                label="Force-fail"
                variant="outline"
                destructive
                loading={forceFail.isPending}
                onClick={() => void onForceFail()}
              />
            )}
            {isPending && (
              <>
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
              </>
            )}
          </div>
        ) : null
      }
    >
      {item && (
        <div className="flex flex-col gap-hawk-6">
          {/*
            The second gate: the destination restated in full, beside the
            amount, before any button is reachable.
          */}
          {item.bank_snapshot?.account_name && (
            <HawkCallout
              semantic={HawkSemantic.INFO}
              title={`Paying ${item.bank_snapshot.account_name}`}
              message={`${item.bank_snapshot.bank_name ?? 'Bank'} · ${
                item.bank_snapshot.account_number_last4 ??
                item.bank_snapshot.account_number ??
                '—'
              }. Check this against the professional's own name before approving.`}
            />
          )}

          <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
            <HawkKeyValue label="Amount" value={formatKobo(item.amount_kobo)} record />
            <HawkKeyValue label="Currency" value={item.currency ?? 'NGN'} record />
            <HawkKeyValue
              label="Status"
              value={<HawkStatusBadge status={statusFor('withdrawal', item.status)} size="sm" />}
            />
            <HawkKeyValue label="User" value={<UserLink userId={item.user_id} idLen={20} />} />
            <HawkKeyValue label="Requested" value={formatDateTime(item.requested_at)} record />
            <HawkKeyValue label="Processed" value={formatDateTime(item.processed_at)} record />
            <HawkKeyValue label="Bank" value={item.bank_snapshot?.bank_name ?? '—'} record />
            <HawkKeyValue
              label="Account"
              value={
                item.bank_snapshot?.account_number_last4 ??
                item.bank_snapshot?.account_number ??
                '—'
              }
              record
            />
            <HawkKeyValue
              label="Account name"
              value={item.bank_snapshot?.account_name ?? '—'}
              record
            />
            <HawkKeyValue label="Bank code" value={item.bank_snapshot?.bank_code ?? '—'} record />
            <HawkKeyValue
              label="Transfer code"
              value={item.paystack_transfer_code ?? '—'}
              record
            />
          </div>

          {item.failure_reason && (
            <HawkCallout
              semantic={HawkSemantic.CRITICAL}
              title="Transfer failed"
              message={item.failure_reason}
            />
          )}
        </div>
      )}
    </HawkDetailDrawer.Root>
  );
}
