import { useState } from 'react';

import { AdminCallStatus, type AdminCallListItem } from '@ohlify/api';
import {
  HawkButton,
  HawkCaption,
  HawkDot,
  HawkSemantic,
  HawkStatusBadge,
  IconPhone,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';
// The test-call dialog below is pre-Hawk and left as it was — it is a dev
// tool, not an operator surface, and migrating it buys nothing.
import { AppButton, AppText, AppTextInput } from '@ohlify/ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { statusFor, statusTabs } from '../../../shared/parts/board-status.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDuration, formatRelative } from '../../../shared/format/datetime.js';
import { shortId } from '../../../shared/lib/labels.js';
import { useAdminCalls, useTestInitCall } from '../api/use-calls.js';
import { CallDetailDrawer } from '../parts/call-detail-drawer.js';

/**
 * The calls board.
 *
 * `in_progress` rows are the only genuinely live thing in the admin console,
 * so they carry a pulsing marker — everything else here is history. An
 * operator opening this screen mid-incident is looking for the call that is
 * happening right now, and a table where the live row looks like the other
 * three hundred is a table they have to search.
 */
export function CallsListScreen() {
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showTest, setShowTest] = useState(false);

  const list = useAdminCalls({ status });
  const testInit = useTestInitCall();

  const live = list.items.filter((row) => row.status === AdminCallStatus.IN_PROGRESS).length;
  const completed = list.items.filter((row) => row.status === AdminCallStatus.COMPLETED).length;
  const totalSeconds = list.items.reduce((sum, row) => sum + (row.connected_seconds ?? 0), 0);

  const kpis: HawkKpi[] = [
    {
      key: 'live',
      label: 'In progress',
      value: live.toLocaleString(),
      icon: IconPhone,
      semantic: live > 0 ? 'success' : 'neutral',
    },
    {
      key: 'completed',
      label: 'Completed on this page',
      value: completed.toLocaleString(),
      icon: IconPhone,
    },
    {
      key: 'talk',
      label: 'Connected time',
      value: formatDuration(totalSeconds),
      icon: IconPhone,
    },
    {
      key: 'shown',
      label: 'Rows shown',
      value: list.items.length.toLocaleString(),
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminCallListItem>> = [
    {
      key: 'id',
      header: 'Call',
      width: '13%',
      render: (row) => (
        <span className="flex items-center gap-hawk-2">
          {row.status === AdminCallStatus.IN_PROGRESS && (
            <HawkDot semantic={HawkSemantic.SUCCESS} size={6} pulse label="Live" />
          )}
          <span className="hawk-record">{shortId(row.id, 12)}</span>
        </span>
      ),
    },
    {
      key: 'parties',
      header: 'Parties',
      width: '30%',
      render: (row) => (
        <div className="flex flex-col">
          <span className="flex items-center gap-hawk-2">
            <HawkCaption ink="disabled">caller</HawkCaption>
            <UserLink userId={row.caller_user_id} idLen={16} />
          </span>
          <span className="flex items-center gap-hawk-2">
            <HawkCaption ink="disabled">callee</HawkCaption>
            <UserLink userId={row.callee_user_id} idLen={16} />
          </span>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Agora channel',
      width: '17%',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{row.agora_channel_name ?? '—'}</span>
      ),
    },
    {
      key: 'connected',
      header: 'Connected',
      align: 'right',
      width: '11%',
      render: (row) => (
        <span className="hawk-record">{formatDuration(row.connected_seconds)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '16%',
      render: (row) => <HawkStatusBadge status={statusFor('call', row.status)} size="sm" />,
    },
    {
      key: 'when',
      header: 'Started',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{formatRelative(row.created_at)}</span>
      ),
    },
  ];

  return (
    <>
      <BoardScreen
        title="Calls"
        subtitle={
          live > 0 ? `${live} in progress right now` : 'Inspect, force-end, or refund calls.'
        }
        actions={
          <HawkButton
            label="Test call"
            variant="outline"
            onClick={() => setShowTest(true)}
          />
        }
        kpis={kpis}
        tabs={statusTabs('call')}
        activeTab={status}
        onTabChange={setStatus}
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        onRowClick={(row) => setOpenId(row.id)}
        emptyTitle="No calls"
        emptyDescription="Nothing matches this status filter."
      />

      <CallDetailDrawer callId={openId} onClose={() => setOpenId(null)} />

      {showTest && (
        <TestInitDialog
          isPending={testInit.isPending}
          onCancel={() => setShowTest(false)}
          onSubmit={(vars) =>
            testInit.mutate(vars, {
              onSuccess: () => {
                toastSuccess('Test call initiated');
                setShowTest(false);
                list.refetch();
              },
              onError: (err) => toastError(err),
            })
          }
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
