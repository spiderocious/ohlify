import { useState } from 'react';

import { AdminReportStatus, type AdminReport } from '@ohlify/api';
import {
  HawkButton,
  HawkCallout,
  HawkCaption,
  HawkDetailDrawer,
  HawkKeyValue,
  HawkSearchInput,
  HawkSemantic,
  HawkStatusBadge,
  HawkText,
  IconFlag,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { BoardScreen } from '../../../shared/parts/board-screen.js';
import { statusFor, statusTabs } from '../../../shared/parts/board-status.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useDismissReport, useReports, useResolveReport } from '../api/use-reports.js';

/** Targets that are a person rather than an artefact — those get a user link. */
function isUserTarget(type: string): boolean {
  return type === 'profile' || type === 'user';
}

/**
 * The reports queue (A25).
 *
 * A report is a claim, not a fact, so the row is built to surface *what was
 * claimed and against whom* rather than to imply a verdict. The reason and
 * the target lead; the reporter follows, because who complained matters less
 * than what they complained about — until it turns out one person files
 * everything, which the reporter column makes visible over a page.
 */
export function ReportsListScreen() {
  const [status, setStatus] = useState<string>(AdminReportStatus.PENDING);
  const [targetType, setTargetType] = useState('');
  const [open, setOpen] = useState<AdminReport | null>(null);

  const list = useReports({ status, target_type: targetType });

  const pending = list.items.filter((row) => row.status === AdminReportStatus.PENDING);
  const oldest = pending.reduce<string | null>(
    (acc, row) => (acc === null || row.created_at < acc ? row.created_at : acc),
    null,
  );

  const kpis: HawkKpi[] = [
    {
      key: 'pending',
      label: 'Awaiting review',
      value: pending.length.toLocaleString(),
      icon: IconFlag,
      semantic: pending.length > 0 ? 'caution' : 'success',
    },
    {
      key: 'oldest',
      label: 'Oldest waiting',
      value: oldest ? formatRelative(oldest) : '—',
      icon: IconFlag,
      semantic: 'caution',
    },
    {
      key: 'shown',
      label: 'Rows shown',
      value: list.items.length.toLocaleString(),
    },
  ];

  const columns: ReadonlyArray<HawkColumn<AdminReport>> = [
    {
      key: 'reason',
      header: 'Reason',
      width: '20%',
      render: (row) => (
        <HawkText variant="label" ink="strong" className="font-medium">
          {humanizeStatus(row.reason_code)}
        </HawkText>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      width: '24%',
      render: (row) => (
        <div className="flex flex-col">
          <HawkCaption ink="muted">{humanizeStatus(row.target_type)}</HawkCaption>
          {isUserTarget(row.target_type) ? (
            <UserLink userId={row.target_id} idLen={16} />
          ) : (
            <span className="hawk-record text-hawk-ink-muted">
              {shortId(row.target_id, 16)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'reporter',
      header: 'Reporter',
      width: '20%',
      render: (row) => <UserLink userId={row.reporter_user_id} idLen={16} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (row) => <HawkStatusBadge status={statusFor('report', row.status)} size="sm" />,
    },
    {
      key: 'created',
      header: 'Filed',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{formatRelative(row.created_at)}</span>
      ),
    },
  ];

  return (
    <>
      <BoardScreen
        title="Reports"
        subtitle={
          pending.length > 0
            ? `${pending.length} awaiting review · oldest ${oldest ? formatRelative(oldest) : '—'}`
            : 'User-submitted reports about other users, calls, or reviews.'
        }
        kpis={kpis}
        tabs={statusTabs('report')}
        activeTab={status}
        onTabChange={setStatus}
        filters={
          <div className="w-56">
            <HawkSearchInput
              value={targetType}
              onChange={setTargetType}
              placeholder="Target type — profile, call, review"
            />
          </div>
        }
        columns={columns}
        list={list}
        rowKey={(row) => row.id}
        onRowClick={setOpen}
        emptyTitle="Queue clear"
        emptyDescription="No reports match this filter."
      />

      <ReportDrawer
        item={open}
        onClose={() => setOpen(null)}
        onSettled={() => list.refetch()}
      />
    </>
  );
}

function ReportDrawer({
  item,
  onClose,
  onSettled,
}: {
  item: AdminReport | null;
  onClose: () => void;
  onSettled: () => void;
}) {
  const resolve = useResolveReport(item?.id ?? '');
  const dismiss = useDismissReport(item?.id ?? '');
  const isPending = item?.status === AdminReportStatus.PENDING;

  const act = (
    kind: 'resolve' | 'dismiss',
    mutation: typeof resolve,
    prompt: { title: string; message: string },
  ) => async () => {
    const note = await promptForReason(prompt);
    if (!note) return;
    mutation.mutate(
      { note },
      {
        onSuccess: () => {
          toastSuccess(kind === 'resolve' ? 'Report resolved' : 'Report dismissed');
          onSettled();
          onClose();
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const onResolve = act('resolve', resolve, {
    title: 'Resolve report',
    message: 'Describe the action you took. This is logged against your account.',
  });

  const onDismiss = act('dismiss', dismiss, {
    title: 'Dismiss report',
    message: 'Why is this report not actionable?',
  });

  return (
    <HawkDetailDrawer.Root
      open={item !== null}
      onClose={onClose}
      title={item ? humanizeStatus(item.reason_code) : 'Report'}
      subtitle={item ? `${humanizeStatus(item.target_type)} · ${shortId(item.id, 14)}` : undefined}
      actions={
        item && isPending ? (
          <div className="flex w-full items-center justify-end gap-hawk-3">
            <HawkButton
              label="Dismiss"
              variant="outline"
              loading={dismiss.isPending}
              onClick={() => void onDismiss()}
            />
            <HawkButton
              label="Resolve"
              loading={resolve.isPending}
              onClick={() => void onResolve()}
            />
          </div>
        ) : null
      }
    >
      {item && (
        <div className="flex flex-col gap-hawk-6">
          {item.description && (
            <div className="flex flex-col gap-hawk-2">
              <HawkCaption ink="muted">What the reporter said</HawkCaption>
              <HawkText variant="caption" className="whitespace-pre-wrap leading-relaxed">
                {item.description}
              </HawkText>
            </div>
          )}

          <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
            <HawkKeyValue label="Report" value={shortId(item.id, 20)} record />
            <HawkKeyValue
              label="Status"
              value={<HawkStatusBadge status={statusFor('report', item.status)} size="sm" />}
            />
            <HawkKeyValue
              label="Reporter"
              value={<UserLink userId={item.reporter_user_id} idLen={20} />}
            />
            <HawkKeyValue
              label="Target"
              value={
                isUserTarget(item.target_type) ? (
                  <UserLink userId={item.target_id} idLen={20} />
                ) : (
                  <span className="hawk-record">{shortId(item.target_id, 20)}</span>
                )
              }
            />
            <HawkKeyValue label="Target type" value={humanizeStatus(item.target_type)} />
            <HawkKeyValue label="Reason" value={humanizeStatus(item.reason_code)} />
            <HawkKeyValue label="Filed" value={formatDateTime(item.created_at)} record />
            <HawkKeyValue label="Reviewed" value={formatDateTime(item.reviewed_at)} record />
          </div>

          {item.review_note && (
            <HawkCallout
              semantic={
                item.status === AdminReportStatus.DISMISSED
                  ? HawkSemantic.NEUTRAL
                  : HawkSemantic.SUCCESS
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
