import { HawkAdminPanel, HawkCaption, HawkKeyValue, HawkText } from '@ohlify/hawk-ui';
import type { AdminTechnicalDashboard } from '@ohlify/api';

import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { DependencyTile, SaturationBar } from './health-tiles.js';
import { dependencyLabel, formatUptime } from './technical-adapters.js';

/**
 * Service health — is the thing up, and is it close to a limit.
 *
 * First on the page for the same reason the attention band leads the business
 * dashboard: everything below is meaningless if a dependency is down.
 */
export function ServiceHealthSection({
  data,
  isLoading,
}: {
  data: AdminTechnicalDashboard | undefined;
  isLoading: boolean;
}) {
  const loading = isLoading || !data;

  return (
    <section aria-label="Service health" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        Service health
      </HawkText>

      <HawkAdminPanel title="Dependencies">
        {loading ? (
          <RowsSkeleton rows={2} />
        ) : (
          <div className="grid gap-hawk-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.health.dependencies.map((probe) => (
              <DependencyTile
                key={probe.key}
                dependency={{
                  key: probe.key,
                  label: dependencyLabel(probe.key),
                  state: probe.state,
                  detail: probe.detail,
                }}
              />
            ))}
          </div>
        )}
      </HawkAdminPanel>

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Postgres pool">
          {loading ? (
            <RowsSkeleton rows={3} />
          ) : (
            <div className="flex flex-col gap-hawk-5">
              <SaturationBar
                label="Connections"
                value={data.health.pool.total}
                max={data.health.pool.max}
              />
              <div className="flex flex-col gap-hawk-3">
                <HawkKeyValue label="Idle" value={data.health.pool.idle} record />
                <HawkKeyValue label="Waiting" value={data.health.pool.waiting} record />
              </div>
              <HawkCaption ink="muted" className="leading-snug">
                A non-zero <span className="hawk-record">waiting</span> count is the earliest
                warning of database saturation there is — every request in that queue is
                already blocked before a single query runs.
              </HawkCaption>
            </div>
          )}
        </HawkAdminPanel>

        <HawkAdminPanel title="Redis">
          {loading ? (
            <RowsSkeleton rows={4} />
          ) : (
            <div className="flex flex-col gap-hawk-4">
              {/*
                Each field is nullable — a managed Redis can restrict INFO
                sections. "Unknown" and "zero" are different facts, so a
                missing stat renders as a dash rather than as 0.
              */}
              <HawkKeyValue
                label="Memory"
                value={
                  data.health.redis.used_memory_mb === null
                    ? '—'
                    : `${data.health.redis.used_memory_mb} MB`
                }
                record
              />
              <HawkKeyValue
                label="Clients"
                value={data.health.redis.connected_clients ?? '—'}
                record
              />
              <HawkKeyValue
                label="Evicted keys"
                value={data.health.redis.evicted_keys ?? '—'}
                record
              />
              <HawkKeyValue
                label="Hit rate"
                value={
                  data.health.redis.hit_rate_percent === null
                    ? '—'
                    : `${data.health.redis.hit_rate_percent}%`
                }
                record
              />
              <HawkCaption ink="muted" className="leading-snug">
                Evictions are the one to watch: rate limits, idempotency records and cached
                responses all live here, and an evicted idempotency key means a retry runs
                twice.
              </HawkCaption>
            </div>
          )}
        </HawkAdminPanel>

        <HawkAdminPanel title="Process">
          {loading ? (
            <RowsSkeleton rows={6} />
          ) : (
            <div className="flex flex-col gap-hawk-4">
              <SaturationBar
                label="Heap"
                value={data.health.process.heap_used_mb}
                max={data.health.process.heap_total_mb}
                format={(v, m) => `${v} / ${m} MB`}
              />
              <HawkKeyValue label="RSS" value={`${data.health.process.rss_mb} MB`} record />
              <HawkKeyValue
                label="Uptime"
                value={formatUptime(data.health.process.uptime_seconds)}
                record
              />
              <HawkKeyValue label="Node" value={data.health.process.node_version} record />
              {/*
                Which build is actually serving. The single most useful line on
                this page when something started failing an hour ago.
              */}
              <HawkKeyValue
                label="Commit"
                value={data.health.process.commit_sha ?? 'local'}
                record
              />
              <HawkKeyValue
                label="Migration"
                value={data.health.process.migration_version ?? '—'}
                record
              />
            </div>
          )}
        </HawkAdminPanel>
      </div>
    </section>
  );
}
