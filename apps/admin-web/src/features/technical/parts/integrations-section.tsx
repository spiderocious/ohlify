import {
  HawkAdminPanel,
  HawkCallout,
  HawkCaption,
  HawkDataState,
  HawkKeyValue,
  HawkSemantic,
  HawkTable,
  HawkText,
  type HawkColumn,
} from '@ohlify/hawk-ui';
import type { AdminTechnicalDashboard } from '@ohlify/api';

import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { CountTile, SaturationBar } from './health-tiles.js';
import { formatSeconds } from './technical-adapters.js';

type WebhookTypeRow = AdminTechnicalDashboard['integrations']['webhooks']['by_type'][number];

/**
 * The external dependencies, each with the failure mode that actually bites
 * rather than a generic up/down.
 */
export function IntegrationsSection({
  data,
  isLoading,
}: {
  data: AdminTechnicalDashboard | undefined;
  isLoading: boolean;
}) {
  const loading = isLoading || !data;

  const webhookColumns: ReadonlyArray<HawkColumn<WebhookTypeRow>> = [
    {
      key: 'type',
      header: 'Event type',
      width: '34%',
      render: (row) => <span className="hawk-record">{row.event_type}</span>,
    },
    {
      key: 'received',
      header: 'Received',
      align: 'right',
      render: (row) => row.received.toLocaleString(),
    },
    {
      key: 'processed',
      header: 'Processed',
      align: 'right',
      render: (row) => row.processed.toLocaleString(),
    },
    {
      key: 'errored',
      header: 'Errored',
      align: 'right',
      render: (row) => (
        <span className={row.errored > 0 ? 'font-semibold text-hawk-critical' : undefined}>
          {row.errored}
        </span>
      ),
    },
  ];

  return (
    <section aria-label="Integrations" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        Integrations
      </HawkText>

      <HawkAdminPanel
        title="Paystack webhooks"
        actions={
          !loading && (
            <HawkCaption ink="muted" className="hawk-record">
              {data.integrations.webhooks.replayed} replayed
            </HawkCaption>
          )
        }
      >
        {loading ? (
          <RowsSkeleton rows={3} />
        ) : (
          <div className="flex flex-col gap-hawk-5">
            <div className="grid grid-cols-2 gap-hawk-5 sm:grid-cols-3">
              <CountTile
                label="Unprocessed"
                value={data.integrations.webhooks.unprocessed}
                hint={
                  formatSeconds(data.integrations.webhooks.oldest_unprocessed_seconds)
                    ? `oldest ${formatSeconds(data.integrations.webhooks.oldest_unprocessed_seconds)}`
                    : 'none waiting'
                }
              />
              <CountTile
                label="Errored"
                value={data.integrations.webhooks.errored}
                hint="processing_error set"
              />
              <CountTile
                label="Manually replayed"
                value={data.integrations.webhooks.replayed}
                zeroIsGood={false}
                hint="replay_count > 0"
              />
            </div>

            {data.integrations.webhooks.unprocessed > 0 && (
              <HawkCallout
                semantic={HawkSemantic.CRITICAL}
                title="Unprocessed charge webhooks mean uncredited users"
                message="A charge.success that never processed is a payment the user made and a wallet that was never credited. This is the one integration failure that costs money rather than time."
              />
            )}
          </div>
        )}
      </HawkAdminPanel>

      <HawkAdminPanel title="By event type" flush>
        <HawkTable
          bare
          columns={webhookColumns}
          rows={data?.integrations.webhooks.by_type}
          rowKey={(row) => row.event_type}
          dataState={loading ? HawkDataState.LOADING : HawkDataState.FRESH}
          emptyTitle="No webhooks in range"
        />
      </HawkAdminPanel>

      <div className="grid gap-hawk-6 lg:grid-cols-2">
        <HawkAdminPanel title="Push tokens">
          {loading ? (
            <RowsSkeleton rows={4} />
          ) : (
            <div className="flex flex-col gap-hawk-4">
              <SaturationBar
                label="Android share"
                value={data.integrations.push.android}
                max={Math.max(1, data.integrations.push.registered_tokens)}
                format={(v, m) => `${v} / ${m}`}
              />
              <HawkKeyValue
                label="Registered"
                value={data.integrations.push.registered_tokens.toLocaleString()}
                record
              />
              <HawkKeyValue label="iOS" value={data.integrations.push.ios} record />
              <HawkKeyValue label="Android" value={data.integrations.push.android} record />
              <HawkKeyValue label="Web" value={data.integrations.push.web} record />
              <HawkCaption ink="muted" className="leading-snug">
                FCM distinguishes a permanently dead token from a transient failure, and the
                provider prunes the former automatically — so the registered count is live
                devices rather than every token ever seen.
              </HawkCaption>
            </div>
          )}
        </HawkAdminPanel>

        <HawkAdminPanel title="Agora">
          {loading ? (
            <RowsSkeleton rows={2} />
          ) : (
            <div className="flex flex-col gap-hawk-4">
              <HawkKeyValue
                label="Signature verification"
                value={
                  data.integrations.agora.signature_verification_enabled ? 'Enabled' : 'Disabled'
                }
                record
              />
              {/*
                With AGORA_WEBHOOK_SECRET unset the verifier returns true for
                everything — verification silently becomes advisory. Nothing
                else on the platform would reveal that, so it is stated here.
              */}
              {!data.integrations.agora.signature_verification_enabled && (
                <HawkCallout
                  semantic={HawkSemantic.CAUTION}
                  title="Signature verification is off"
                  message="AGORA_WEBHOOK_SECRET is unset, so every delivery is accepted without verification. Fine in development, never in production."
                />
              )}
            </div>
          )}
        </HawkAdminPanel>
      </div>
    </section>
  );
}
