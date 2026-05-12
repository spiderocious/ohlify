import { useState } from 'react';

import { AppButton, AppText } from '@ohlify/ui';
import { ADMIN_EP, type AdminPaystackWebhookSummary } from '@ohlify/api';

import { useAdminMutation } from '../../../shared/api/use-admin-mutation.js';
import { useAdminQuery } from '../../../shared/api/use-admin-query.js';
import { useQueryClient } from '@tanstack/react-query';

import { DataTable, type ColumnDef } from '../../../shared/parts/data-table.js';
import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { StatusPill, type StatusTone } from '../../../shared/parts/status-pill.js';
import { confirm, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatRelative } from '../../../shared/format/datetime.js';
import { shortId } from '../../../shared/lib/labels.js';

function tone(w: AdminPaystackWebhookSummary): { label: string; tone: StatusTone } {
  if (w.processing_error) return { label: 'Errored', tone: 'danger' };
  if (w.processed_at) return { label: 'Processed', tone: 'success' };
  return { label: 'Pending', tone: 'warning' };
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

export function WebhooksListScreen() {
  const [open, setOpen] = useState<AdminPaystackWebhookSummary | null>(null);
  const list = useWebhooks();
  const replay = useReplayWebhook();

  const onReplay = async (id: string) => {
    if (
      !(await confirm({
        title: 'Replay webhook?',
        message:
          "Re-runs the handler with the stored envelope. Idempotent on the journal idempotency key — but verify before replaying anything that touches money.",
        destructive: true,
      }))
    )
      return;
    replay.mutate(
      { webhook_id: id },
      {
        onSuccess: () => toastSuccess('Webhook replayed'),
        onError: (err) => toastError(err),
      },
    );
  };

  const columns: ColumnDef<AdminPaystackWebhookSummary>[] = [
    { key: 'event', header: 'Event', width: '24%', render: (w) => <code>{w.event_type}</code> },
    {
      key: 'eid',
      header: 'Event ID',
      width: '20%',
      render: (w) => <code className="text-xs">{shortId(w.event_id, 16)}</code>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '14%',
      render: (w) => {
        const t = tone(w);
        return <StatusPill label={t.label} tone={t.tone} />;
      },
    },
    { key: 'replays', header: 'Replays', width: '10%', align: 'right', render: (w) => w.replay_count ?? 0 },
    {
      key: 'received',
      header: 'Received',
      width: '14%',
      render: (w) => <span className="text-text-muted">{formatRelative(w.received_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '14%',
      align: 'right',
      render: (w) => (
        <AppButton
          label="Replay"
          variant="outline"
          height={30}
          onPressed={() => onReplay(w.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Webhooks" subtitle="Recent Paystack webhook envelopes + replay." />

      <DataTable
        columns={columns}
        rows={list.data}
        rowKey={(w) => w.id}
        isLoading={list.isLoading}
        error={list.error}
        emptyTitle="No webhooks"
        onRowClick={(w) => setOpen(w)}
      />

      <DetailDrawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? `Webhook ${shortId(open.id, 12)}` : 'Webhook'}
        subtitle={open?.event_type}
        width={560}
        footer={
          open ? (
            <AppButton
              label="Replay this webhook"
              variant="solid"
              height={36}
              onPressed={() => onReplay(open.id)}
            />
          ) : null
        }
      >
        {open && (
          <DetailSection title="Webhook">
            <DetailRow label="Event"><code>{open.event_type}</code></DetailRow>
            <DetailRow label="Event ID"><code>{open.event_id}</code></DetailRow>
            <DetailRow label="Status">
              <StatusPill label={tone(open).label} tone={tone(open).tone} />
            </DetailRow>
            <DetailRow label="Received">{formatDateTime(open.received_at)}</DetailRow>
            <DetailRow label="Processed">{formatDateTime(open.processed_at)}</DetailRow>
            <DetailRow label="Replays">{open.replay_count ?? 0}</DetailRow>
            <DetailRow label="Error">
              {open.processing_error ? (
                <pre className="whitespace-pre-wrap break-words text-xs text-red-700">
                  {open.processing_error}
                </pre>
              ) : (
                <AppText variant="bodySmall" className="text-text-muted">
                  None
                </AppText>
              )}
            </DetailRow>
          </DetailSection>
        )}
      </DetailDrawer>
    </>
  );
}
