import {
  HawkAdminPanel,
  HawkBadge,
  HawkBarChart,
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

import { ChartSkeleton, RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { CountTile, GuardTile } from './health-tiles.js';
import { points } from './technical-adapters.js';

type ConfigChange = AdminTechnicalDashboard['config']['recent_changes'][number];

/**
 * Realtime, data integrity, runtime config and call plumbing.
 *
 * Grouped because each is a statement about the platform's current *state*
 * rather than about traffic through it — the things that are true right now
 * regardless of how busy the last hour was.
 */
export function PlatformStateSection({
  data,
  isLoading,
}: {
  data: AdminTechnicalDashboard | undefined;
  isLoading: boolean;
}) {
  const loading = isLoading || !data;

  const configColumns: ReadonlyArray<HawkColumn<ConfigChange>> = [
    {
      key: 'key',
      header: 'Key',
      width: '34%',
      render: (row) => <span className="hawk-record">{row.key}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      width: '14%',
      render: (row) => <span className="hawk-record">{row.value}</span>,
    },
    {
      key: 'visibility',
      header: 'Visibility',
      width: '16%',
      render: (row) => (
        <HawkBadge
          label={row.is_public ? 'Public' : 'Private'}
          semantic={row.is_public ? HawkSemantic.INFO : HawkSemantic.NEUTRAL}
          size="sm"
        />
      ),
    },
    { key: 'by', header: 'Changed by', render: (row) => row.updated_by ?? 'system' },
    {
      key: 'at',
      header: 'When',
      align: 'right',
      width: '14%',
      render: (row) => (
        <span className="hawk-record">
          {new Date(row.updated_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            timeZone: 'UTC',
          })}
        </span>
      ),
    },
  ];

  return (
    <section aria-label="Platform state" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        Platform state
      </HawkText>

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Realtime (SSE)">
          {loading ? (
            <RowsSkeleton rows={3} />
          ) : (
            <div className="flex flex-col gap-hawk-4">
              <HawkKeyValue
                label="Connections"
                value={data.realtime.connections.toLocaleString()}
                record
              />
              <HawkKeyValue
                label="Distinct users"
                value={data.realtime.distinct_users.toLocaleString()}
                record
              />
              {/*
                The registry is an in-process Map, so this is one instance's
                share. Redis picks which PROCESS hears an event; routing to a
                socket is in memory. Worth saying before anyone reads the
                number as a platform total.
              */}
              <HawkCaption ink="muted" className="leading-snug">
                Counted per process — the registry is in-memory, and Redis only decides which
                process hears an event. On a single instance this is the whole picture; it stops
                being so the moment a second one starts.
              </HawkCaption>
            </div>
          )}
        </HawkAdminPanel>

        <HawkAdminPanel title="Data integrity" className="lg:col-span-2">
          {loading ? (
            <RowsSkeleton rows={3} />
          ) : (
            <div className="flex flex-col gap-hawk-5">
              <div className="grid grid-cols-2 gap-hawk-5 sm:grid-cols-3">
                <CountTile
                  label="Ended calls unsettled"
                  value={data.integrity.unsettled_calls}
                  hint="no settlement_journal_id"
                />
                <CountTile
                  label="Intents expired"
                  value={data.integrity.expired_intents}
                  hint="never satisfied"
                />
                <CountTile
                  label="Orphan device tokens"
                  value={data.integrity.orphan_device_tokens}
                  hint="cascade should prevent this"
                />
              </div>

              {data.integrity.ledger_balanced ? (
                <GuardTile
                  label="Ledger balanced"
                  intact
                  hint="every account's ledger sum matches its cached balance"
                />
              ) : (
                <HawkCallout
                  semantic={HawkSemantic.CRITICAL}
                  hazard
                  title={`${data.integrity.drift_accounts.length} account(s) drifted`}
                  message="Cached balances disagree with the ledger. An AFTER INSERT trigger keeps these in step under an advisory lock, so drift means the trigger was bypassed."
                />
              )}
            </div>
          )}
        </HawkAdminPanel>
      </div>

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Runtime config">
          {loading ? (
            <RowsSkeleton rows={3} />
          ) : (
            <div className="flex flex-col gap-hawk-4">
              <HawkKeyValue label="Keys" value={data.config.total_keys} record />
              <HawkKeyValue label="Public" value={data.config.public_keys} record />
              <HawkKeyValue
                label="Changed this week"
                value={data.config.changed_this_week}
                record
              />
            </div>
          )}
        </HawkAdminPanel>

        <HawkAdminPanel title="Version gates" className="lg:col-span-2">
          {loading ? (
            <RowsSkeleton rows={2} />
          ) : (
            <div className="flex flex-col gap-hawk-4">
              {data.config.version_gates.map((gate) => (
                <div
                  key={gate.platform}
                  className="flex flex-wrap items-baseline justify-between gap-hawk-4 rounded-hawk-sm border border-hawk-line px-hawk-5 py-hawk-4"
                >
                  <span className="flex items-baseline gap-hawk-3">
                    <HawkText variant="label" ink="strong" className="font-medium">
                      {gate.platform}
                    </HawkText>
                    <HawkText variant="caption" record ink="muted">
                      min {gate.min_version}
                    </HawkText>
                    <HawkBadge
                      label={gate.forced ? 'Forced' : 'Advisory'}
                      semantic={gate.forced ? HawkSemantic.CRITICAL : HawkSemantic.NEUTRAL}
                      size="sm"
                    />
                  </span>
                  <HawkCaption ink="muted" className="hawk-record">
                    {gate.sessions_below.toLocaleString()} sessions below
                  </HawkCaption>
                </div>
              ))}
            </div>
          )}
        </HawkAdminPanel>
      </div>

      <HawkAdminPanel title="Recent config changes" flush>
        <HawkTable
          bare
          columns={configColumns}
          rows={data?.config.recent_changes}
          rowKey={(row) => row.key}
          dataState={loading ? HawkDataState.LOADING : HawkDataState.FRESH}
          emptyTitle="No recent changes"
        />
      </HawkAdminPanel>

      <HawkAdminPanel
        title="Call event streams"
        actions={<HawkCaption ink="muted">server vs client</HawkCaption>}
      >
        {loading ? (
          <ChartSkeleton height={170} />
        ) : (
          <div className="flex flex-col gap-hawk-6">
            <div className="grid grid-cols-2 gap-hawk-5 sm:grid-cols-4">
              <CountTile
                label="Server events"
                value={data.call_streams.server_events}
                hint="call_events"
                zeroIsGood={false}
              />
              <CountTile
                label="Client events"
                value={data.call_streams.client_events}
                hint="call_session_events"
                zeroIsGood={false}
              />
              <CountTile
                label="No client end"
                value={data.call_streams.missing_client_end}
                hint="server ended, no ca:ended"
              />
              <CountTile
                label="Orphan streams"
                value={data.call_streams.orphan_client_streams}
                hint="client call_id the server does not know"
              />
            </div>

            {data.call_streams.client_event_mix.length > 0 && (
              <HawkBarChart
                data={points(data.call_streams.client_event_mix)}
                horizontal
                height={170}
                semantic={HawkSemantic.NEUTRAL}
              />
            )}

            <HawkCaption ink="muted" className="leading-snug">
              Two logs describe the same calls from opposite sides, and the disagreement is the
              useful part. A call the server closed with no client{' '}
              <span className="hawk-record">ca:ended</span> is a real bug — comparing the streams
              is the only way it becomes visible.
            </HawkCaption>
          </div>
        )}
      </HawkAdminPanel>
    </section>
  );
}
