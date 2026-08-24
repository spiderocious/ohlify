import { useState } from 'react';

import {
  AdminTransactionSource,
  type AdminTransactionListItem,
} from '@ohlify/api';
import {
  HawkAdminPanel,
  HawkBadge,
  HawkCallout,
  HawkCaption,
  HawkDetailDrawer,
  HawkDropdown,
  HawkKeyValue,
  HawkLedgerRow,
  HawkSearchInput,
  HawkSemantic,
  HawkStatusBadge,
  HawkText,
  IconLedger,
  IconReceipt,
  formatKobo,
  formatKoboCompact,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { statusFor } from '../../../shared/parts/board-status.js';
import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useTransaction, useTransactions } from '../api/use-transactions.js';

const SOURCE_OPTIONS = [
  { value: '', label: 'Any source' },
  ...Object.values(AdminTransactionSource).map((v) => ({
    value: v,
    label: humanizeStatus(v),
  })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'pending', label: 'Pending' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'reversed', label: 'Reversed' },
];

/**
 * The transactions board — scale and precision at once (A23).
 *
 * Two different things share this table: Paystack **payments** and ledger
 * **journals**. They are not normalised into one shape, because they are not
 * one thing — a payment is money arriving from outside, a journal is money
 * moving inside. The `source` column says which, and the drawer renders the
 * matching view rather than a lowest common denominator of both.
 */
export function TransactionsListScreen() {
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useTransactions({ source, status, user_id: userId });

  const pageTotal = list.items.reduce((sum, row) => sum + Number(row.amount_kobo), 0);
  const payments = list.items.filter(
    (row) => row.source === AdminTransactionSource.PAYMENT,
  ).length;

  const kpis: HawkKpi[] = [
    {
      key: 'value',
      label: 'Value on this page',
      valueKobo: pageTotal,
      icon: IconReceipt,
      basis: 'gross',
    },
    {
      key: 'payments',
      label: 'Payments',
      value: payments.toLocaleString(),
      icon: IconReceipt,
    },
    {
      key: 'journals',
      label: 'Journal entries',
      value: (list.items.length - payments).toLocaleString(),
      icon: IconLedger,
    },
    {
      key: 'shown',
      label: 'Rows shown',
      value: list.items.length.toLocaleString(),
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminTransactionListItem>> = [
    {
      key: 'ref',
      header: 'Reference',
      width: '22%',
      render: (row) => (
        <span className="hawk-record">{row.reference ?? shortId(row.id, 14)}</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      width: '12%',
      render: (row) => (
        <HawkBadge
          label={humanizeStatus(row.source)}
          semantic={
            row.source === AdminTransactionSource.PAYMENT
              ? HawkSemantic.INFO
              : HawkSemantic.NEUTRAL
          }
          size="sm"
        />
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '16%',
      render: (row) => <HawkCaption>{humanizeStatus(row.type ?? '')}</HawkCaption>,
    },
    {
      key: 'user',
      header: 'User',
      width: '14%',
      render: (row) => <UserLink userId={row.user_id} idLen={12} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: '14%',
      render: (row) => (
        <span className="hawk-record font-semibold">{formatKobo(row.amount_kobo)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (row) => <HawkStatusBadge status={statusFor('transaction', row.status)} size="sm" />,
    },
    {
      key: 'when',
      header: 'When',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{formatRelative(row.created_at)}</span>
      ),
    },
  ];

  return (
    <>
      <BoardScreen
        title="Transactions"
        subtitle={`Payments and journal entries · ${formatKoboCompact(pageTotal)} on this page`}
        kpis={kpis}
        filters={
          <>
            <HawkDropdown
              options={SOURCE_OPTIONS}
              value={source}
              onChange={setSource}
              placeholder="Any source"
            />
            <HawkDropdown
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              placeholder="Any status"
            />
            <div className="w-56">
              <HawkSearchInput
                value={userId}
                onChange={setUserId}
                placeholder="Filter by user ID"
              />
            </div>
          </>
        }
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        onRowClick={(row) => setOpenId(row.id)}
        emptyTitle="No transactions"
        emptyDescription="Nothing matches these filters."
      />

      <TransactionDrawer id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function TransactionDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useTransaction(id);
  const data = detail.data;

  return (
    <HawkDetailDrawer.Root
      open={id !== null}
      onClose={onClose}
      title={data?.source === 'payment' ? 'Payment' : 'Journal entry'}
      subtitle={id ? shortId(id, 20) : undefined}
    >
      {detail.isLoading && <RowsSkeleton rows={8} />}

      {!detail.isLoading && detail.error && (
        <HawkCallout
          semantic={HawkSemantic.CRITICAL}
          title="Could not load"
          message={detail.error.errorMessage ?? 'The request failed.'}
        />
      )}

      {data?.source === 'payment' && <PaymentView data={data} />}
      {data?.source === 'journal' && <JournalView data={data} />}
    </HawkDetailDrawer.Root>
  );
}

function PaymentView({
  data,
}: {
  data: Extract<NonNullable<ReturnType<typeof useTransaction>['data']>, { source: 'payment' }>;
}) {
  const p = data.payment;

  return (
    <div className="flex flex-col gap-hawk-6">
      <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
        <HawkKeyValue label="Payment" value={shortId(p.id, 20)} record />
        <HawkKeyValue
          label="Status"
          value={<HawkStatusBadge status={statusFor('transaction', p.status)} size="sm" />}
        />
        <HawkKeyValue label="Reference" value={p.reference ?? '—'} record />
        <HawkKeyValue label="Paystack ref" value={p.paystack_reference ?? '—'} record />
        <HawkKeyValue label="User" value={<UserLink userId={p.user_id} idLen={20} />} />
        <HawkKeyValue label="Purpose" value={humanizeStatus(p.purpose ?? '')} />
        <HawkKeyValue label="Amount" value={formatKobo(p.amount_kobo)} record />
        <HawkKeyValue
          label="Processor fees"
          value={p.paystack_fees_kobo !== null ? formatKobo(p.paystack_fees_kobo) : '—'}
          record
        />
        <HawkKeyValue label="Currency" value={p.currency ?? 'NGN'} record />
        <HawkKeyValue label="Paid" value={formatDateTime(p.paid_at)} record />
        <HawkKeyValue label="Created" value={formatDateTime(p.created_at)} record />
      </div>

      {data.related_webhooks && data.related_webhooks.length > 0 && (
        <HawkAdminPanel title={`Webhooks (${data.related_webhooks.length})`}>
          <div className="flex flex-col gap-hawk-4">
            {data.related_webhooks.map((hook) => (
              <div key={hook.id} className="flex flex-col gap-hawk-1">
                <div className="flex flex-wrap items-baseline justify-between gap-hawk-3">
                  <HawkText variant="label" record ink="strong" className="font-medium">
                    {hook.event_type}
                  </HawkText>
                  <HawkCaption ink="muted" className="hawk-record">
                    {formatDateTime(hook.received_at)}
                  </HawkCaption>
                </div>
                {/*
                  An errored webhook on a successful payment is the shape of
                  "the user paid and was never credited" — the single most
                  expensive failure this console reports.
                */}
                {hook.processing_error ? (
                  <HawkCaption className="text-hawk-critical">
                    {hook.processing_error}
                  </HawkCaption>
                ) : (
                  <HawkCaption ink="muted">
                    {hook.processed_at ? 'Processed' : 'Awaiting processing'}
                  </HawkCaption>
                )}
              </div>
            ))}
          </div>
        </HawkAdminPanel>
      )}
    </div>
  );
}

function JournalView({
  data,
}: {
  data: Extract<NonNullable<ReturnType<typeof useTransaction>['data']>, { source: 'journal' }>;
}) {
  const j = data.journal;
  const lines = data.lines;
  const sum = lines.reduce((total, line) => total + Number(line.signed_amount_kobo), 0);

  return (
    <div className="flex flex-col gap-hawk-6">
      <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
        <HawkKeyValue label="Journal" value={shortId(j.id, 20)} record />
        <HawkKeyValue label="Kind" value={humanizeStatus(j.kind)} />
        <HawkKeyValue label="Idempotency" value={j.idempotency_key} record />
        <HawkKeyValue label="Memo" value={j.memo ?? '—'} />
        <HawkKeyValue label="Related call" value={shortId(j.related_call_id, 18)} record />
        <HawkKeyValue label="Related payment" value={shortId(j.related_payment_id, 18)} record />
        <HawkKeyValue
          label="Related withdrawal"
          value={shortId(j.related_withdrawal_id, 18)}
          record
        />
        <HawkKeyValue label="Created" value={formatDateTime(j.created_at)} record />
      </div>

      <HawkAdminPanel title={`Lines (${lines.length})`} flush>
        <div className="flex flex-col">
          {lines.map((line) => {
            const amount = Number(line.signed_amount_kobo);
            return (
              <HawkLedgerRow
                key={line.id}
                account={shortId(line.account_id, 14)}
                accountName={line.account_label ?? humanizeStatus(line.account_kind)}
                // Separate columns rather than one signed figure: a ledger
                // where debits and credits share a column is one you have to
                // read twice to balance.
                {...(amount < 0 ? { debitKobo: Math.abs(amount) } : { creditKobo: amount })}
              />
            );
          })}
        </div>
      </HawkAdminPanel>

      {/*
        Every journal's lines sum to zero by construction — a deferred
        constraint trigger enforces it at COMMIT. Showing the sum is a free
        assertion that the row in front of you is intact.
      */}
      <HawkCallout
        semantic={sum === 0 ? HawkSemantic.SUCCESS : HawkSemantic.CRITICAL}
        message={
          sum === 0
            ? 'Lines balance to zero, as double-entry requires.'
            : `Lines sum to ${formatKobo(sum)} rather than zero — this journal is malformed.`
        }
      />
    </div>
  );
}
