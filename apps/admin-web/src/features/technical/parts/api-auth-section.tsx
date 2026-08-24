import {
  HawkAdminPanel,
  HawkBadge,
  HawkBarChart,
  HawkCaption,
  HawkDataState,
  HawkSemantic,
  HawkTable,
  HawkText,
  type HawkColumn,
} from '@ohlify/hawk-ui';
import type { AdminAuthEvent, AdminTechnicalDashboard } from '@ohlify/api';

import { ChartSkeleton, KpiStripSkeleton } from '../../../shared/parts/board-skeletons.js';
import { CountTile } from './health-tiles.js';
import { points } from './technical-adapters.js';

/**
 * The API edge: idempotency and the auth event stream.
 *
 * Per-request latency and error rates are deliberately absent — `requestLog`
 * emits those to pino rather than to a table, so there is nothing to query and
 * inventing a p95 would be worse than omitting one.
 *
 * Auth outcomes come from `auth_events`, which now exists: `auth_sessions`
 * recorded only successes, so a rejected password landed nowhere and failure
 * counts were underivable. The log fixes that and is also what lockout and
 * abuse detection need.
 */
export function ApiAuthSection({
  data,
  isLoading,
}: {
  data: AdminTechnicalDashboard | undefined;
  isLoading: boolean;
}) {
  const loading = isLoading || !data;

  const authColumns: ReadonlyArray<HawkColumn<AdminAuthEvent>> = [
    {
      key: 'at',
      header: 'Time',
      width: '12%',
      render: (row) => (
        <span className="hawk-record">
          {new Date(row.created_at).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'UTC',
          })}
        </span>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      width: '14%',
      render: (row) => <span className="hawk-record">{row.event}</span>,
    },
    {
      key: 'outcome',
      header: 'Outcome',
      width: '20%',
      render: (row) => (
        <HawkBadge
          label={row.outcome === 'success' ? 'Success' : (row.reason ?? 'Failure')}
          semantic={row.outcome === 'success' ? HawkSemantic.SUCCESS : HawkSemantic.CRITICAL}
          size="sm"
        />
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      width: '22%',
      render: (row) => <span className="hawk-record">{row.subject ?? '—'}</span>,
    },
    {
      key: 'origin',
      header: 'Origin',
      render: (row) => (
        <span className="hawk-record">
          {row.ip ?? '—'}
          {row.platform ? ` · ${row.platform}` : ''}
          {row.app_version ? ` ${row.app_version}` : ''}
        </span>
      ),
    },
  ];

  const attempts = loading ? 0 : data.api.auth.logins + data.api.auth.login_failures;
  const failureRate = attempts === 0 ? 0 : (data!.api.auth.login_failures / attempts) * 100;

  return (
    <section aria-label="API and auth" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        API &amp; auth
      </HawkText>

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Auth outcomes" className="lg:col-span-2">
          {loading ? (
            <KpiStripSkeleton />
          ) : (
            <div className="flex flex-col gap-hawk-6">
              <div className="grid grid-cols-2 gap-hawk-5 sm:grid-cols-4">
                <CountTile label="Logins" value={data.api.auth.logins} zeroIsGood={false} />
                <CountTile label="Login failures" value={data.api.auth.login_failures} />
                <CountTile
                  label="Registrations"
                  value={data.api.auth.registrations}
                  zeroIsGood={false}
                />
                <CountTile
                  label="Suspicious IPs"
                  value={data.api.auth.suspicious_ips}
                  hint="5+ failures from one address"
                />
              </div>

              <div className="flex flex-col gap-hawk-3">
                <HawkCaption ink="muted">
                  Failure reasons · {failureRate.toFixed(1)}% of attempts
                </HawkCaption>
                {data.api.auth.failure_reasons.length === 0 ? (
                  <HawkCaption ink="disabled">No failed attempts in this period.</HawkCaption>
                ) : (
                  <HawkBarChart
                    data={points(data.api.auth.failure_reasons)}
                    horizontal
                    height={150}
                    semantic={HawkSemantic.CRITICAL}
                  />
                )}
              </div>
            </div>
          )}
        </HawkAdminPanel>

        <HawkAdminPanel title="Idempotency">
          {loading ? (
            <ChartSkeleton height={150} />
          ) : (
            <div className="flex flex-col gap-hawk-5">
              <div className="grid grid-cols-2 gap-hawk-5">
                <CountTile
                  label="Keys stored"
                  value={data.api.idempotency.keys_stored}
                  zeroIsGood={false}
                />
                <CountTile
                  label="Replays"
                  value={data.api.idempotency.replays}
                  zeroIsGood={false}
                />
              </div>
              <HawkCaption ink="muted" className="leading-snug">
                A replay is the feature working — the same key arriving twice returns the stored
                response instead of charging twice.
              </HawkCaption>
            </div>
          )}
        </HawkAdminPanel>
      </div>

      <HawkAdminPanel
        title="Recent auth events"
        flush
        actions={<HawkCaption ink="muted">auth_events</HawkCaption>}
      >
        <HawkTable
          bare
          columns={authColumns}
          rows={data?.api.auth.recent}
          rowKey={(row) => row.id}
          dataState={loading ? HawkDataState.LOADING : HawkDataState.FRESH}
          emptyTitle="No auth events"
          emptyDescription="Nothing has signed in or registered since the log was added."
        />
      </HawkAdminPanel>
    </section>
  );
}
