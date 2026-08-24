import { useState } from 'react';

import type { AdminJournalSummary } from '@ohlify/api';
import {
  HawkCallout,
  HawkCaption,
  HawkDetailDrawer,
  HawkKeyValue,
  HawkSearchInput,
  HawkSemantic,
  HawkText,
  IconLedger,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useJournalDetail, useJournals } from '../api/use-wallet.js';

/**
 * The journal ledger (A28).
 *
 * Every posting on the platform, newest first. The `Related` column is the
 * useful one: a journal on its own is an id and a kind, and what makes it
 * legible is the call, payment or withdrawal it settles.
 */
export function JournalsListScreen() {
  const [kind, setKind] = useState('');
  const [userId, setUserId] = useState('');
  const [callId, setCallId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useJournals({ kind, user_id: userId, call_id: callId });

  const kpis: HawkKpi[] = [
    {
      key: 'shown',
      label: 'Postings shown',
      value: list.items.length.toLocaleString(),
      icon: IconLedger,
    },
    {
      key: 'kinds',
      label: 'Distinct kinds',
      value: new Set(list.items.map((row) => row.kind)).size.toLocaleString(),
      icon: IconLedger,
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminJournalSummary>> = [
    {
      key: 'id',
      header: 'Journal',
      width: '17%',
      render: (row) => <span className="hawk-record">{shortId(row.id, 14)}</span>,
    },
    {
      key: 'kind',
      header: 'Kind',
      width: '19%',
      render: (row) => <HawkText variant="label">{humanizeStatus(row.kind)}</HawkText>,
    },
    {
      key: 'rel',
      header: 'Related',
      width: '30%',
      render: (row) => {
        const links = [
          row.related_call_id && `call · ${shortId(row.related_call_id, 14)}`,
          row.related_payment_id && `payment · ${shortId(row.related_payment_id, 14)}`,
          row.related_withdrawal_id && `withdrawal · ${shortId(row.related_withdrawal_id, 14)}`,
        ].filter(Boolean) as string[];

        if (links.length === 0 && !row.related_user_id) {
          return <HawkCaption ink="disabled">—</HawkCaption>;
        }

        return (
          <div className="flex flex-col">
            {links.map((link) => (
              <HawkCaption key={link} ink="muted" className="hawk-record">
                {link}
              </HawkCaption>
            ))}
            {row.related_user_id && (
              <span className="flex items-center gap-hawk-2">
                <HawkCaption ink="disabled">user</HawkCaption>
                <UserLink userId={row.related_user_id} idLen={14} />
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'memo',
      header: 'Memo',
      render: (row) => (
        <HawkCaption ink="muted" clamp={1}>
          {row.memo ?? '—'}
        </HawkCaption>
      ),
    },
    {
      key: 'when',
      header: 'Posted',
      align: 'right',
      width: '12%',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{formatRelative(row.created_at)}</span>
      ),
    },
  ];

  return (
    <>
      <BoardScreen
        title="Journals"
        subtitle="Every double-entry posting on the ledger, newest first."
        kpis={kpis}
        query={kind}
        onQueryChange={setKind}
        searchPlaceholder="Filter by journal kind"
        filters={
          <>
            <div className="w-52">
              <HawkSearchInput
                value={userId}
                onChange={setUserId}
                placeholder="Related user ID"
              />
            </div>
            <div className="w-52">
              <HawkSearchInput
                value={callId}
                onChange={setCallId}
                placeholder="Related call ID"
              />
            </div>
          </>
        }
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        onRowClick={(row) => setOpenId(row.id)}
        emptyTitle="No journals"
        emptyDescription="Nothing matches these filters."
      />

      <JournalDrawer id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function JournalDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useJournalDetail(id);
  const data = detail.data;

  return (
    <HawkDetailDrawer.Root
      open={Boolean(id)}
      onClose={onClose}
      title={data ? humanizeStatus(data.kind) : 'Journal'}
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

      {data && (
        <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
          <HawkKeyValue label="Journal" value={shortId(data.id, 20)} record />
          <HawkKeyValue label="Kind" value={humanizeStatus(data.kind)} />
          <HawkKeyValue label="Idempotency" value={data.idempotency_key} record />
          <HawkKeyValue label="Memo" value={data.memo ?? '—'} />
          <HawkKeyValue label="Related call" value={shortId(data.related_call_id, 18)} record />
          <HawkKeyValue
            label="Related payment"
            value={shortId(data.related_payment_id, 18)}
            record
          />
          <HawkKeyValue
            label="Related withdrawal"
            value={shortId(data.related_withdrawal_id, 18)}
            record
          />
          <HawkKeyValue
            label="Related user"
            value={
              data.related_user_id ? (
                <UserLink userId={data.related_user_id} idLen={18} />
              ) : (
                '—'
              )
            }
          />
          <HawkKeyValue label="Posted" value={formatDateTime(data.created_at)} record />
          <HawkKeyValue
            label="Posted by"
            value={
              data.created_by_admin_id ? (
                <UserLink userId={data.created_by_admin_id} idLen={18} />
              ) : (
                'system'
              )
            }
          />
        </div>
      )}
    </HawkDetailDrawer.Root>
  );
}
