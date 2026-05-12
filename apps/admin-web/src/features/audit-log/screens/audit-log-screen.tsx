import { useState } from 'react';

import { AppText, AppTextInput } from '@ohlify/ui';
import type { AdminAuditLogEntry } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { shortId } from '../../../shared/lib/labels.js';
import { useAuditLog } from '../api/use-audit.js';

export function AuditLogScreen() {
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [adminUserId, setAdminUserId] = useState('');
  const [open, setOpen] = useState<AdminAuditLogEntry | null>(null);
  const list = useAuditLog({
    action,
    target_type: targetType,
    admin_user_id: adminUserId,
  });

  const columns: ColumnDef<AdminAuditLogEntry>[] = [
    {
      key: 'admin',
      header: 'Admin',
      width: '20%',
      render: (e) => <UserLink userId={e.admin_user_id} idLen={16} />,
    },
    { key: 'action', header: 'Action', width: '24%', render: (e) => <code>{e.action}</code> },
    {
      key: 'target',
      header: 'Target',
      width: '24%',
      render: (e) => (
        <div className="flex flex-col">
          <span>{e.target_type ?? '—'}</span>
          <code className="text-[10px] text-text-muted">{shortId(e.target_id, 14)}</code>
        </div>
      ),
    },
    { key: 'ip', header: 'IP', width: '14%', render: (e) => e.ip_address ?? '—' },
    {
      key: 'when',
      header: 'When',
      width: '18%',
      render: (e) => <span className="text-text-muted">{formatRelative(e.created_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every admin write is logged here." />

      <FilterBar>
        <div className="w-72">
          <AppTextInput
            label="Action"
            placeholder="users.suspend"
            value={action}
            onChange={setAction}
          />
        </div>
        <div className="w-56">
          <AppTextInput
            label="Target type"
            placeholder="user, refund…"
            value={targetType}
            onChange={setTargetType}
          />
        </div>
        <div className="w-72">
          <AppTextInput
            label="Admin user ID"
            placeholder="adm_…"
            value={adminUserId}
            onChange={setAdminUserId}
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(e) => e.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No audit entries"
        onRowClick={(e) => setOpen(e)}
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

      <DetailDrawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? `Audit ${shortId(open.id, 12)}` : 'Audit entry'}
        subtitle={open?.action}
        width={600}
      >
        {open && (
          <>
            <DetailSection title="Audit entry">
              <DetailRow label="Action">
                <code>{open.action}</code>
              </DetailRow>
              <DetailRow label="Admin">
                <UserLink userId={open.admin_user_id} idLen={18} />
              </DetailRow>
              <DetailRow label="Target type">{open.target_type ?? '—'}</DetailRow>
              <DetailRow label="Target ID">
                {open.target_type === 'user' || open.target_type === 'profile' ? (
                  <UserLink userId={open.target_id} idLen={18} />
                ) : (
                  shortId(open.target_id, 18)
                )}
              </DetailRow>
              <DetailRow label="IP">{open.ip_address ?? '—'}</DetailRow>
              <DetailRow label="User agent">
                <span className="text-text-muted text-xs break-all">{open.user_agent ?? '—'}</span>
              </DetailRow>
              <DetailRow label="When">{formatDateTime(open.created_at)}</DetailRow>
            </DetailSection>

            <DetailSection title="Metadata">
              {open.metadata ? (
                <pre className="max-h-96 overflow-auto rounded-md bg-surface-light p-3 text-xs text-text-primary">
                  {JSON.stringify(open.metadata, null, 2)}
                </pre>
              ) : (
                <AppText variant="bodySmall" className="text-text-muted">
                  No metadata captured
                </AppText>
              )}
            </DetailSection>
          </>
        )}
      </DetailDrawer>
    </>
  );
}
