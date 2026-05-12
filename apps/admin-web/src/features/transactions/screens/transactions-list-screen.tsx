import { useState } from 'react';

import { AppDropdownInput, AppText, AppTextInput } from '@ohlify/ui';
import {
  AdminTransactionSource,
  type AdminTransactionListItem,
} from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { StatusPill } from '../../../shared/parts/status-pill.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { formatKobo } from '../../../shared/format/kobo.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useTransaction, useTransactions } from '../api/use-transactions.js';

const SOURCE_OPTIONS = [
  { label: 'Any source', value: '' },
  ...Object.values(AdminTransactionSource).map((v) => ({ label: humanizeStatus(v), value: v })),
];

const STATUS_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
  { label: 'Abandoned', value: 'abandoned' },
  { label: 'Reversed', value: 'reversed' },
];

export function TransactionsListScreen() {
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useTransactions({ source, status, user_id: userId });

  const columns: ColumnDef<AdminTransactionListItem>[] = [
    {
      key: 'ref',
      header: 'Reference',
      width: '22%',
      render: (t) => (
        <code className="text-text-primary text-xs">{t.reference ?? shortId(t.id, 12)}</code>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      width: '12%',
      render: (t) => humanizeStatus(t.source),
    },
    { key: 'type', header: 'Type', width: '14%', render: (t) => humanizeStatus(t.type ?? '') },
    {
      key: 'user',
      header: 'User',
      width: '14%',
      render: (t) => <UserLink userId={t.user_id} idLen={12} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '14%',
      align: 'right',
      render: (t) => (
        <span className="font-semibold tabular-nums">{formatKobo(t.amount_kobo)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (t) => <StatusPill label={humanizeStatus(t.status)} tone="muted" />,
    },
    {
      key: 'when',
      header: 'When',
      width: '12%',
      render: (t) => <span className="text-text-muted">{formatRelative(t.created_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Transactions" subtitle="Payments + journal entries across the platform." />

      <FilterBar>
        <div className="w-44">
          <AppDropdownInput
            label="Source"
            options={SOURCE_OPTIONS}
            value={source}
            onChange={setSource}
          />
        </div>
        <div className="w-44">
          <AppDropdownInput
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
          />
        </div>
        <div className="w-72">
          <AppTextInput label="User ID" placeholder="user uuid" value={userId} onChange={setUserId} />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(t) => t.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No transactions"
        onRowClick={(t) => setOpenId(t.id)}
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

      <TxDrawer id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function TxDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useTransaction(id);
  return (
    <DetailDrawer
      open={Boolean(id)}
      onClose={onClose}
      title={id ? `Transaction ${shortId(id, 12)}` : 'Transaction'}
      width={600}
    >
      <QueryView isLoading={detail.isLoading} error={detail.error}>
        {detail.data && detail.data.source === 'payment' && (
          <PaymentDetailView data={detail.data} />
        )}
        {detail.data && detail.data.source === 'journal' && (
          <JournalDetailView data={detail.data} />
        )}
      </QueryView>
    </DetailDrawer>
  );
}

function PaymentDetailView({
  data,
}: {
  data: Extract<ReturnType<typeof useTransaction>['data'], { source: 'payment' }>;
}) {
  if (!data) return null;
  const p = data.payment;
  return (
    <>
      <DetailSection title="Payment">
        <DetailRow label="ID">{shortId(p.id, 18)}</DetailRow>
        <DetailRow label="Status">
          <StatusPill label={humanizeStatus(p.status)} tone="muted" />
        </DetailRow>
        <DetailRow label="Reference">
          <code>{p.reference ?? '—'}</code>
        </DetailRow>
        <DetailRow label="Paystack ref">
          <code>{p.paystack_reference ?? '—'}</code>
        </DetailRow>
        <DetailRow label="User">
          <UserLink userId={p.user_id} idLen={18} />
        </DetailRow>
        <DetailRow label="Purpose">{humanizeStatus(p.purpose ?? '')}</DetailRow>
        <DetailRow label="Amount">
          <AppText variant="bodyTitle">{formatKobo(p.amount_kobo)}</AppText>
        </DetailRow>
        <DetailRow label="Paystack fees">
          {p.paystack_fees_kobo !== null ? formatKobo(p.paystack_fees_kobo) : '—'}
        </DetailRow>
        <DetailRow label="Currency">{p.currency ?? '—'}</DetailRow>
        <DetailRow label="Paid at">{formatDateTime(p.paid_at)}</DetailRow>
        <DetailRow label="Created">{formatDateTime(p.created_at)}</DetailRow>
        <DetailRow label="Updated">{formatDateTime(p.updated_at)}</DetailRow>
      </DetailSection>

      {data.related_webhooks && data.related_webhooks.length > 0 && (
        <DetailSection title={`Related webhooks (${data.related_webhooks.length})`}>
          <ul className="flex flex-col gap-2">
            {data.related_webhooks.map((w) => (
              <li
                key={w.id}
                className="rounded-md border border-border bg-surface-light px-3 py-2 text-xs"
              >
                <div className="flex items-baseline justify-between">
                  <code className="font-semibold text-text-primary">{w.event_type}</code>
                  <span className="text-text-muted">{formatDateTime(w.received_at)}</span>
                </div>
                <div className="mt-0.5 text-text-muted">
                  Event {shortId(w.event_id, 18)} ·{' '}
                  {w.processing_error ? (
                    <span className="text-red-700">{w.processing_error}</span>
                  ) : w.processed_at ? (
                    'processed'
                  ) : (
                    'pending'
                  )}
                </div>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
    </>
  );
}

function JournalDetailView({
  data,
}: {
  data: Extract<ReturnType<typeof useTransaction>['data'], { source: 'journal' }>;
}) {
  if (!data) return null;
  const j = data.journal;
  return (
    <>
      <DetailSection title="Journal">
        <DetailRow label="ID">{shortId(j.id, 18)}</DetailRow>
        <DetailRow label="Kind">{humanizeStatus(j.kind)}</DetailRow>
        <DetailRow label="Idempotency">
          <code className="text-xs">{j.idempotency_key}</code>
        </DetailRow>
        <DetailRow label="Memo">{j.memo ?? '—'}</DetailRow>
        <DetailRow label="Related call">{shortId(j.related_call_id, 18)}</DetailRow>
        <DetailRow label="Related payment">{shortId(j.related_payment_id, 18)}</DetailRow>
        <DetailRow label="Related withdrawal">
          {shortId(j.related_withdrawal_id, 18)}
        </DetailRow>
        <DetailRow label="Created">{formatDateTime(j.created_at)}</DetailRow>
        <DetailRow label="Created by">{shortId(j.created_by_admin_id, 18)}</DetailRow>
      </DetailSection>

      <DetailSection title={`Lines (${data.lines.length})`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-text-muted">
              <th className="py-1 font-bold">Account</th>
              <th className="py-1 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line) => {
              const num =
                typeof line.signed_amount_kobo === 'string'
                  ? Number(line.signed_amount_kobo)
                  : line.signed_amount_kobo;
              return (
                <tr key={line.id} className="border-t border-border/60">
                  <td className="py-1.5">
                    <div className="flex flex-col">
                      <span className="text-text-primary">
                        {line.account_label ?? humanizeStatus(line.account_kind)}
                      </span>
                      <code className="text-[10px] text-text-muted">
                        {shortId(line.account_id, 14)}
                      </code>
                    </div>
                  </td>
                  <td
                    className={
                      'py-1.5 text-right font-semibold tabular-nums ' +
                      (num >= 0 ? 'text-emerald-700' : 'text-red-700')
                    }
                  >
                    {formatKobo(line.signed_amount_kobo, { signed: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DetailSection>
    </>
  );
}
