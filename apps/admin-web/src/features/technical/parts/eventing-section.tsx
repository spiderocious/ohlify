import {
  HawkAdminPanel,
  HawkBarChart,
  HawkCaption,
  HawkDataState,
  HawkIcon,
  HawkSemantic,
  HawkTable,
  HawkText,
  type HawkColumn,
} from '@ohlify/hawk-ui';
import type { AdminOutboxDeadLetter, AdminTechnicalDashboard } from '@ohlify/api';

import { KpiStripSkeleton } from '../../../shared/parts/board-skeletons.js';
import { CountTile } from './health-tiles.js';
import { KNOWN_QUEUES, formatSeconds, points } from './technical-adapters.js';

/**
 * The event spine — the outbox and the job queues.
 *
 * The richest technical surface in the codebase, and nothing observed it
 * before. The worker already records everything needed: attempt counts, the
 * last error string, and a dead-letter marker (`last_error` prefixed
 * `permanent: ` once attempts reach the ceiling of 8).
 *
 * Backlog depth is the obvious number and the less useful one. **Lag — the age
 * of the oldest unpublished row — is the health metric**: a backlog of two
 * thousand draining in ten seconds is fine, and three rows stuck for an hour
 * is an outage nobody has noticed.
 */
export function EventingSection({
  data,
  isLoading,
}: {
  data: AdminTechnicalDashboard | undefined;
  isLoading: boolean;
}) {
  const loading = isLoading || !data;

  const deadLetterColumns: ReadonlyArray<HawkColumn<AdminOutboxDeadLetter>> = [
    {
      key: 'event',
      header: 'Event',
      width: '24%',
      render: (row) => <span className="hawk-record">{row.event_type}</span>,
    },
    {
      key: 'aggregate',
      header: 'Aggregate',
      width: '20%',
      render: (row) => (
        <span className="hawk-record">
          {row.aggregate_type} · {row.aggregate_id}
        </span>
      ),
    },
    {
      key: 'error',
      header: 'Last error',
      render: (row) => <span className="hawk-record">{row.error ?? '—'}</span>,
    },
    {
      key: 'attempts',
      header: 'Attempts',
      align: 'right',
      width: '10%',
      render: (row) => row.attempts,
    },
    {
      key: 'age',
      header: 'Age',
      align: 'right',
      width: '12%',
      render: (row) => <span className="hawk-record">{formatSeconds(row.age_seconds)}</span>,
    },
  ];

  return (
    <section aria-label="Eventing" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        Eventing
      </HawkText>

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Outbox" className="lg:col-span-2">
          {loading ? (
            <KpiStripSkeleton />
          ) : (
            <div className="flex flex-col gap-hawk-6">
              <div className="grid grid-cols-2 gap-hawk-5 sm:grid-cols-4">
                <CountTile
                  label="Backlog"
                  value={data.outbox.backlog}
                  hint="published_at IS NULL"
                  zeroIsGood={false}
                />
                <div className="flex flex-col gap-hawk-1">
                  <HawkText variant="medium" record className="font-semibold">
                    {formatSeconds(data.outbox.oldest_lag_seconds) ?? '—'}
                  </HawkText>
                  <HawkText variant="label">Oldest lag</HawkText>
                  <HawkCaption ink="disabled" className="leading-snug">
                    The real health metric
                  </HawkCaption>
                </div>
                <CountTile
                  label="Dead letters"
                  value={data.outbox.dead_lettered}
                  hint="attempts exhausted at 8"
                />
                <CountTile
                  label="Published / hour"
                  value={data.outbox.published_last_hour}
                  zeroIsGood={false}
                />
              </div>

              <div className="grid gap-hawk-6 sm:grid-cols-2">
                <div className="flex flex-col gap-hawk-3">
                  <HawkCaption ink="muted">Retry distribution</HawkCaption>
                  {data.outbox.retries.length === 0 ? (
                    <HawkCaption ink="disabled">Nothing pending.</HawkCaption>
                  ) : (
                    <HawkBarChart
                      data={points(data.outbox.retries)}
                      height={130}
                      semantic={HawkSemantic.CAUTION}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-hawk-3">
                  <HawkCaption ink="muted">Failures by event type</HawkCaption>
                  {data.outbox.failures_by_type.length === 0 ? (
                    <HawkCaption ink="disabled">No failing events.</HawkCaption>
                  ) : (
                    <HawkBarChart
                      data={points(data.outbox.failures_by_type)}
                      horizontal
                      height={130}
                      semantic={HawkSemantic.CRITICAL}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </HawkAdminPanel>

        <HawkAdminPanel title="Queues">
          <div className="flex flex-col gap-hawk-5">
            {KNOWN_QUEUES.map((queue) => (
              <div
                key={queue.name}
                className="flex items-start gap-hawk-4 rounded-hawk-sm border border-hawk-line p-hawk-5"
              >
                <HawkIcon icon={queue.icon} size={15} className="mt-hawk-1 text-hawk-ink-muted" />
                <div className="flex min-w-0 flex-col gap-hawk-1">
                  <HawkText variant="label" ink="strong" className="font-medium">
                    {queue.label}
                  </HawkText>
                  <HawkCaption ink="disabled" className="hawk-record">
                    {queue.name}
                  </HawkCaption>
                </div>
              </div>
            ))}
            {/*
              Depths are not reported: reading them needs a live BullMQ
              connection from the request path, and the outbox above IS fully
              measured and is where the real backlog risk sits. Listing the
              queues keeps them visible without implying a measurement.
            */}
            <HawkCaption ink="muted" className="leading-snug">
              Both run at concurrency 1 by design — each job either moves money or sends in
              bulk, and a serial queue keeps ordering unambiguous. Depths are not polled; the
              outbox above carries the backlog signal.
            </HawkCaption>
          </div>
        </HawkAdminPanel>
      </div>

      <HawkAdminPanel
        title="Dead letters"
        flush
        actions={
          <HawkCaption ink="muted">last_error starts &ldquo;permanent:&rdquo;</HawkCaption>
        }
      >
        <HawkTable
          bare
          columns={deadLetterColumns}
          rows={data?.outbox.dead_letters}
          rowKey={(row) => row.id}
          dataState={loading ? HawkDataState.LOADING : HawkDataState.FRESH}
          emptyTitle="No dead letters"
          emptyDescription="Every event published within its retry budget."
        />
      </HawkAdminPanel>
    </section>
  );
}
