import { useState } from 'react';

import { AppText, AppTextInput } from '@ohlify/ui';
import type { AdminJournalSummary } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useJournalDetail, useJournals } from '../api/use-wallet.js';

export function JournalsListScreen() {
  const [kind, setKind] = useState('');
  const [userId, setUserId] = useState('');
  const [callId, setCallId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useJournals({ kind, user_id: userId, call_id: callId });

  const columns: ColumnDef<AdminJournalSummary>[] = [
    { key: 'id', header: 'Journal', width: '18%', render: (j) => shortId(j.id, 14) },
    { key: 'kind', header: 'Kind', width: '20%', render: (j) => humanizeStatus(j.kind) },
    {
      key: 'rel',
      header: 'Related',
      width: '32%',
      render: (j) => (
        <div className="flex flex-col text-xs">
          {j.related_call_id && <span>call · {shortId(j.related_call_id, 14)}</span>}
          {j.related_payment_id && <span>payment · {shortId(j.related_payment_id, 14)}</span>}
          {j.related_withdrawal_id && (
            <span>withdrawal · {shortId(j.related_withdrawal_id, 14)}</span>
          )}
          {j.related_user_id && (
            <span>
              user · <UserLink userId={j.related_user_id} idLen={14} />
            </span>
          )}
          {!j.related_call_id &&
            !j.related_payment_id &&
            !j.related_withdrawal_id &&
            !j.related_user_id && <span className="text-text-muted">—</span>}
        </div>
      ),
    },
    {
      key: 'memo',
      header: 'Memo',
      width: '18%',
      render: (j) => <span className="line-clamp-1">{j.memo ?? '—'}</span>,
    },
    {
      key: 'when',
      header: 'When',
      width: '12%',
      render: (j) => <span className="text-text-muted">{formatRelative(j.created_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Journals" subtitle="Every double-entry posting on the ledger." />

      <FilterBar>
        <div className="w-44">
          <AppTextInput label="Kind" placeholder="funding, refund…" value={kind} onChange={setKind} />
        </div>
        <div className="w-72">
          <AppTextInput label="User ID" placeholder="user uuid" value={userId} onChange={setUserId} />
        </div>
        <div className="w-72">
          <AppTextInput label="Call ID" placeholder="call uuid" value={callId} onChange={setCallId} />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(j) => j.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No journals"
        onRowClick={(j) => setOpenId(j.id)}
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

      <JournalDrawer id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function JournalDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useJournalDetail(id);
  return (
    <DetailDrawer
      open={Boolean(id)}
      onClose={onClose}
      title={id ? `Journal ${shortId(id, 12)}` : 'Journal'}
      width={560}
    >
      <QueryView isLoading={detail.isLoading} error={detail.error}>
        {detail.data && (
          <DetailSection title="Journal">
            <DetailRow label="ID">{shortId(detail.data.id, 18)}</DetailRow>
            <DetailRow label="Kind">{humanizeStatus(detail.data.kind)}</DetailRow>
            <DetailRow label="Idempotency">
              <code className="text-xs">{detail.data.idempotency_key}</code>
            </DetailRow>
            <DetailRow label="Memo">{detail.data.memo ?? '—'}</DetailRow>
            <DetailRow label="Related call">{shortId(detail.data.related_call_id, 18)}</DetailRow>
            <DetailRow label="Related payment">
              {shortId(detail.data.related_payment_id, 18)}
            </DetailRow>
            <DetailRow label="Related withdrawal">
              {shortId(detail.data.related_withdrawal_id, 18)}
            </DetailRow>
            <DetailRow label="Related user">
              {detail.data.related_user_id ? (
                <UserLink userId={detail.data.related_user_id} idLen={18} />
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow label="Posted">{formatDateTime(detail.data.created_at)}</DetailRow>
            <DetailRow label="Posted by">
              {detail.data.created_by_admin_id ? (
                <UserLink userId={detail.data.created_by_admin_id} idLen={18} />
              ) : (
                '—'
              )}
            </DetailRow>
          </DetailSection>
        )}
        {detail.data && (
          <DetailSection title="Raw payload">
            <pre className="max-h-96 overflow-auto rounded-md bg-surface-light p-3 text-xs text-text-primary">
              {JSON.stringify(detail.data, null, 2)}
            </pre>
          </DetailSection>
        )}
      </QueryView>
    </DetailDrawer>
  );
}
