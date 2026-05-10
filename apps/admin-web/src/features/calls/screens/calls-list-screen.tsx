import { useState } from 'react';

import { AppButton, AppDropdownInput, AppText, AppTextInput } from '@ohlify/ui';
import { AdminCallStatus, type AdminCallListItem } from '@ohlify/api';

import { CursorPagination } from '../../../shared/parts/cursor-pagination.js';
import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { FilterBar } from '../../../shared/parts/filter-bar.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { confirm, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { formatDuration, formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useAdminCalls, useTestInitCall } from '../api/use-calls.js';
import { CallStatusPill } from '../parts/call-status-pill.js';
import { CallDetailDrawer } from '../parts/call-detail-drawer.js';

const STATUS_OPTIONS = [
  { label: 'Any', value: '' },
  ...Object.values(AdminCallStatus).map((v) => ({ label: humanizeStatus(v), value: v })),
];

export function CallsListScreen() {
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useAdminCalls({ status });
  const testInit = useTestInitCall();
  const [showTest, setShowTest] = useState(false);

  const columns: ColumnDef<AdminCallListItem>[] = [
    { key: 'id', header: 'Call', width: '14%', render: (c) => shortId(c.id, 12) },
    {
      key: 'parties',
      header: 'Parties',
      width: '34%',
      render: (c) => (
        <div className="flex flex-col">
          <AppText variant="bodySmall">
            <span className="text-text-muted">caller →</span>{' '}
            <UserLink userId={c.caller_user_id} idLen={16} />
          </AppText>
          <AppText variant="bodySmall">
            <span className="text-text-muted">callee →</span>{' '}
            <UserLink userId={c.callee_user_id} idLen={16} />
          </AppText>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      width: '14%',
      render: (c) => <code className="text-xs">{c.agora_channel_name ?? '—'}</code>,
    },
    {
      key: 'connected',
      header: 'Connected',
      width: '12%',
      render: (c) => formatDuration(c.connected_seconds),
    },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (c) => <CallStatusPill status={c.status} />,
    },
    {
      key: 'when',
      header: 'Created',
      width: '12%',
      render: (c) => <span className="text-text-muted">{formatRelative(c.created_at)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Calls"
        subtitle="Inspect, force-end, or refund calls."
        actions={
          <AppButton
            label="Test-init call"
            variant="outline"
            height={36}
            onPressed={() => setShowTest(true)}
          />
        }
      />

      <FilterBar>
        <div className="w-44">
          <AppDropdownInput
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(c) => c.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No calls"
        onRowClick={(c) => setOpenId(c.id)}
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

      <CallDetailDrawer callId={openId} onClose={() => setOpenId(null)} />
      {showTest && (
        <TestInitDialog
          isPending={testInit.isPending}
          onCancel={() => setShowTest(false)}
          onSubmit={async (vars) => {
            if (
              !(await confirm({
                title: 'Initialize a test call?',
                message:
                  "Books a real call between two users. Caller wallet will be charged at the callee's first active rate.",
                destructive: true,
              }))
            )
              return;
            testInit.mutate(vars, {
              onSuccess: () => {
                toastSuccess('Test call initialized');
                setShowTest(false);
              },
              onError: (err) => toastError(err),
            });
          }}
        />
      )}
    </>
  );
}

interface TestInitVars {
  caller_user_id: string;
  callee_user_id: string;
  rate_id?: string;
  start_in_seconds?: number;
}

function TestInitDialog({
  isPending,
  onCancel,
  onSubmit,
}: {
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (vars: TestInitVars) => void;
}) {
  const [callerId, setCallerId] = useState('');
  const [calleeId, setCalleeId] = useState('');
  const [rateId, setRateId] = useState('');
  const [startIn, setStartIn] = useState('0');

  const valid = callerId.length > 0 && calleeId.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
        <AppText variant="bodyTitle" className="text-text-primary">
          Test-init call
        </AppText>
        <AppText variant="bodySmall" className="mt-1 text-text-muted">
          Admin-only utility for QA. Spends caller wallet — use with care.
        </AppText>

        <div className="mt-4 flex flex-col gap-3">
          <AppTextInput
            label="Caller user ID"
            placeholder="user uuid"
            value={callerId}
            onChange={setCallerId}
          />
          <AppTextInput
            label="Callee user ID"
            placeholder="user uuid"
            value={calleeId}
            onChange={setCalleeId}
          />
          <AppTextInput
            label="Rate ID (optional)"
            placeholder="defaults to callee's first active rate"
            value={rateId}
            onChange={setRateId}
          />
          <AppTextInput
            label="Start in (seconds)"
            inputType="number"
            inputMode="numeric"
            value={startIn}
            onChange={setStartIn}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <AppButton label="Cancel" variant="outline" height={36} onPressed={onCancel} />
          <AppButton
            label="Init"
            variant="solid"
            height={36}
            isLoading={isPending}
            onPressed={
              valid
                ? () =>
                    onSubmit({
                      caller_user_id: callerId,
                      callee_user_id: calleeId,
                      ...(rateId ? { rate_id: rateId } : {}),
                      ...(startIn ? { start_in_seconds: Number(startIn) } : {}),
                    })
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
