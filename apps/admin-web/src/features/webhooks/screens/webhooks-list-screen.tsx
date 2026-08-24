import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { ADMIN_EP, type AdminPaystackWebhookSummary } from '@ohlify/api';
import {
  HawkAdminPageHeader,
  HawkAdminPanel,
  HawkButton,
  HawkCallout,
  HawkCaption,
  HawkDataState,
  HawkDetailDrawer,
  HawkDrawer,
  HawkKeyValue,
  HawkKpiStrip,
  HawkSemantic,
  HawkStatusBadge,
  HawkTable,
  HawkText,
  IconRefresh,
  type HawkColumn,
  type HawkKpi,
} from '@ohlify/hawk-ui';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';
import { statusFor } from '../../../shared/parts/board-status.js';
import { toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { shortId } from '../../../shared/lib/labels.js';

/** Which of the three webhook states a row is in. */
function stateOf(row: AdminPaystackWebhookSummary): 'processed' | 'errored' | 'unprocessed' {
  if (row.processing_error) return 'errored';
  return row.processed_at ? 'processed' : 'unprocessed';
}

function useWebhooks() {
  return useAdminQuery<AdminPaystackWebhookSummary[]>({
    key: ['admin', 'wallet', 'webhooks'],
    url: ADMIN_EP.WALLET_PAYSTACK_WEBHOOKS,
    searchParams: { limit: 100 },
  });
}

function useReplayWebhook() {
  const qc = useQueryClient();
  return useAdminMutation<{ webhook_id: string }>(
    { method: 'post', url: ADMIN_EP.WALLET_REPLAY_WEBHOOK },
    {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['admin', 'wallet', 'webhooks'] });
      },
    },
  );
}

/**
 * Paystack webhook envelopes (A26).
 *
 * An unprocessed `charge.success` is the most expensive silent failure the
 * platform has — the user paid and was never credited — so the queue is
 * ordered around *what did not process* rather than around throughput.
 *
 * Replay is a typed confirm rather than a plain one. It is idempotent on the
 * journal key, but "idempotent" is a property of the handler, not a promise
 * about the operator picking the right row.
 */
export function WebhooksListScreen() {
  const [open, setOpen] = useState<AdminPaystackWebhookSummary | null>(null);
  const list = useWebhooks();
  const replay = useReplayWebhook();

  const rows = list.data ?? [];
  const unprocessed = rows.filter((row) => stateOf(row) === 'unprocessed').length;
  const errored = rows.filter((row) => stateOf(row) === 'errored').length;
  const replayed = rows.filter((row) => (row.replay_count ?? 0) > 0).length;

  const kpis: HawkKpi[] = [
    {
      key: 'unprocessed',
      label: 'Unprocessed',
      value: unprocessed.toLocaleString(),
      icon: IconRefresh,
      semantic: unprocessed > 0 ? 'critical' : 'success',
    },
    {
      key: 'errored',
      label: 'Errored',
      value: errored.toLocaleString(),
      icon: IconRefresh,
      semantic: errored > 0 ? 'critical' : 'neutral',
    },
    {
      key: 'replayed',
      label: 'Manually replayed',
      value: replayed.toLocaleString(),
      icon: IconRefresh,
    },
    {
      key: 'shown',
      label: 'Envelopes shown',
      value: rows.length.toLocaleString(),
    },
  ];

  const onReplay = async (row: AdminPaystackWebhookSummary) => {
    const ok = await HawkDrawer.typedConfirm({
      title: 'Replay this webhook?',
      message: `Re-runs the handler against the stored ${row.event_type} envelope. It is idempotent on the journal key, but verify this is the right envelope before replaying anything that moves money.`,
      phrase: 'REPLAY',
    });
    if (!ok) return;
    replay.mutate(
      { webhook_id: row.id },
      {
        onSuccess: () => {
          toastSuccess('Webhook replayed');
          setOpen(null);
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const columns: ReadonlyArray<HawkColumn<AdminPaystackWebhookSummary>> = [
    {
      key: 'event',
      header: 'Event',
      width: '24%',
      render: (row) => <span className="hawk-record">{row.event_type}</span>,
    },
    {
      key: 'eid',
      header: 'Event ID',
      width: '22%',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{shortId(row.event_id, 18)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '16%',
      render: (row) => (
        <HawkStatusBadge status={statusFor('webhook', stateOf(row))} size="sm" />
      ),
    },
    {
      key: 'replays',
      header: 'Replays',
      align: 'right',
      width: '10%',
      render: (row) => <span className="hawk-record">{row.replay_count ?? 0}</span>,
    },
    {
      key: 'received',
      header: 'Received',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">
          {formatRelative(row.received_at)}
        </span>
      ),
    },
  ];

  return (
    <>
      <HawkAdminPageHeader
        title="Webhooks"
        subtitle={
          unprocessed + errored > 0
            ? `${unprocessed + errored} envelope(s) need attention`
            : 'Recent Paystack webhook envelopes and replay.'
        }
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        <HawkKpiStrip items={kpis} />

        {unprocessed > 0 && (
          <HawkCallout
            semantic={HawkSemantic.CRITICAL}
            title="Unprocessed envelopes mean uncredited users"
            message="A charge.success that never processed is a payment the user made and a wallet that was never credited. Open the row, read the error, then replay."
          />
        )}

        <HawkAdminPanel title="Envelopes" flush>
          <HawkTable
            bare
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            dataState={list.isLoading ? HawkDataState.LOADING : HawkDataState.FRESH}
            {...(list.error
              ? { error: list.error.errorMessage ?? 'Could not load webhooks' }
              : {})}
            onRetry={() => void list.refetch()}
            onRowClick={setOpen}
            emptyTitle="No webhooks"
            emptyDescription="Nothing has been received yet."
          />
        </HawkAdminPanel>
      </div>

      <HawkDetailDrawer.Root
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.event_type ?? 'Webhook'}
        subtitle={open ? shortId(open.event_id, 22) : undefined}
        actions={
          open ? (
            <div className="flex w-full items-center justify-end">
              <HawkButton
                label="Replay this webhook"
                variant="outline"
                destructive
                startIcon={IconRefresh}
                loading={replay.isPending}
                onClick={() => void onReplay(open)}
              />
            </div>
          ) : null
        }
      >
        {open && (
          <div className="flex flex-col gap-hawk-6">
            <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
              <HawkKeyValue label="Event" value={open.event_type} record />
              <HawkKeyValue label="Event ID" value={open.event_id} record />
              <HawkKeyValue
                label="Status"
                value={
                  <HawkStatusBadge status={statusFor('webhook', stateOf(open))} size="sm" />
                }
              />
              <HawkKeyValue label="Replays" value={open.replay_count ?? 0} record />
              <HawkKeyValue label="Received" value={formatDateTime(open.received_at)} record />
              <HawkKeyValue label="Processed" value={formatDateTime(open.processed_at)} record />
            </div>

            {open.processing_error ? (
              <div className="flex flex-col gap-hawk-2">
                <HawkCaption ink="muted">Processing error</HawkCaption>
                <HawkText
                  variant="caption"
                  className="whitespace-pre-wrap break-words leading-relaxed text-hawk-critical"
                >
                  {open.processing_error}
                </HawkText>
              </div>
            ) : (
              <HawkCaption ink="muted">No processing error was recorded.</HawkCaption>
            )}
          </div>
        )}
      </HawkDetailDrawer.Root>
    </>
  );
}
