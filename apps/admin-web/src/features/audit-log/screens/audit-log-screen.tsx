import { useState } from 'react';

import type { AdminAuditLogEntry } from '@ohlify/api';
import {
  HawkCaption,
  HawkSearchInput,
  HawkText,
  IconLock,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useAuditLog } from '../api/use-audit.js';

/**
 * The audit log (A09).
 *
 * Every admin write lands here. The action leads rather than the actor,
 * because the question is almost always "what happened to this thing" — you
 * arrive from an incident, not from a person.
 *
 * Money-moving actions are toned so they stand out in a page of routine
 * reads: a manual journal and a config toggle are not the same event, and a
 * uniform list makes the reader do that sorting by eye.
 */

/** Actions that move money or override a guard. */
const HIGH_GRAVITY = /wallet|withdraw|refund|journal|credit|debit|impersonate|block/;

export function AuditLogScreen() {
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [adminUserId, setAdminUserId] = useState('');

  const list = useAuditLog({
    action,
    target_type: targetType,
    admin_user_id: adminUserId,
  });

  const gravity = list.items.filter((row) => HIGH_GRAVITY.test(row.action)).length;
  const actors = new Set(list.items.map((row) => row.admin_user_id).filter(Boolean)).size;

  const kpis: HawkKpi[] = [
    {
      key: 'entries',
      label: 'Entries shown',
      value: list.items.length.toLocaleString(),
      icon: IconLock,
    },
    {
      key: 'gravity',
      label: 'Money-moving',
      value: gravity.toLocaleString(),
      icon: IconLock,
      semantic: gravity > 0 ? 'caution' : 'neutral',
    },
    {
      key: 'actors',
      label: 'Distinct operators',
      value: actors.toLocaleString(),
      icon: IconLock,
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminAuditLogEntry>> = [
    {
      key: 'action',
      header: 'Action',
      width: '26%',
      render: (row) => (
        <HawkText
          variant="label"
          record
          ink="strong"
          className={HIGH_GRAVITY.test(row.action) ? 'font-semibold text-hawk-caution' : ''}
        >
          {row.action}
        </HawkText>
      ),
    },
    {
      key: 'admin',
      header: 'Operator',
      width: '20%',
      render: (row) => <UserLink userId={row.admin_user_id} idLen={16} />,
    },
    {
      key: 'target',
      header: 'Target',
      width: '24%',
      render: (row) => (
        <div className="flex flex-col">
          <HawkCaption>{row.target_type ? humanizeStatus(row.target_type) : '—'}</HawkCaption>
          <HawkCaption ink="disabled" className="hawk-record">
            {shortId(row.target_id, 16)}
          </HawkCaption>
        </div>
      ),
    },
    {
      key: 'ip',
      header: 'Origin',
      width: '14%',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{row.ip_address ?? '—'}</span>
      ),
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
    <BoardScreen
      title="Audit log"
      subtitle="Every admin write is recorded here, with the operator and the reason they gave."
      kpis={kpis}
      query={action}
      onQueryChange={setAction}
      searchPlaceholder="Filter by action — users.suspend"
      filters={
        <>
          <div className="w-48">
            <HawkSearchInput
              value={targetType}
              onChange={setTargetType}
              placeholder="Target type"
            />
          </div>
          <div className="w-52">
            <HawkSearchInput
              value={adminUserId}
              onChange={setAdminUserId}
              placeholder="Operator ID"
            />
          </div>
        </>
      }
      columns={columns}
      list={list}
      rowKey={(row) => row.id}
      emptyTitle="No entries"
      emptyDescription="Nothing matches these filters."
    />
  );
}
