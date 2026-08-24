import { useState } from 'react';

import { AdminDashboardRange } from '@ohlify/api';
import {
  HawkAdminPageHeader,
  HawkButton,
  HawkDot,
  HawkErrorState,
  HawkSemantic,
  HawkText,
  IconPause,
  IconPlay,
  IconRefresh,
} from '@ohlify/hawk-ui';

import { TECHNICAL_REFRESH_MS, useTechnical } from '../api/use-technical.js';
import { ApiAuthSection } from '../parts/api-auth-section.js';
import { EventingSection } from '../parts/eventing-section.js';
import { IntegrationsSection } from '../parts/integrations-section.js';
import { PlatformStateSection } from '../parts/platform-state-section.js';
import { ServiceHealthSection } from '../parts/service-health-section.js';

/**
 * The technical dashboard.
 *
 * Where the business dashboard answers *how did we do*, this answers *is the
 * machine healthy* — so it is built the opposite way round. No date filter:
 * queue depth at 09:04 is worthless at 09:05, and a period average of "outbox
 * backlog" would hide the spike that mattered. Instead it **auto-refreshes**,
 * with a pause control for when someone is reading a table rather than
 * watching a number.
 *
 * Two surfaces are deliberately absent, and their absence is a decision rather
 * than an oversight:
 *
 *   **Per-request metrics.** `requestLog` middleware emits method, path,
 *   status and duration to pino, not to a table — so p95 and error-rate-by-
 *   endpoint cannot be queried. An invented p95 is worse than no p95.
 *
 *   **Worker cron heartbeats.** The loops in `calls.worker.ts` and the
 *   reconciliation worker do not persist a last-run, so "is the cron alive?"
 *   is unanswerable today.
 */
export function TechnicalScreen() {
  const [live, setLive] = useState(true);
  const query = useTechnical(AdminDashboardRange.WEEK, live);

  const updatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null;

  return (
    <>
      <HawkAdminPageHeader
        title="Technical"
        subtitle={
          <span className="flex flex-wrap items-center gap-hawk-3">
            <HawkDot semantic={live ? HawkSemantic.SUCCESS : HawkSemantic.NEUTRAL} pulse={live} />
            <span>
              {live ? `Live · refreshing every ${TECHNICAL_REFRESH_MS / 1000}s` : 'Paused'}
            </span>
            {updatedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span className="hawk-record">
                  updated{' '}
                  {updatedAt.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'UTC',
                  })}{' '}
                  UTC
                </span>
              </>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-hawk-3">
            <HawkButton
              label={live ? 'Pause' : 'Resume'}
              variant="outline"
              startIcon={live ? IconPause : IconPlay}
              onClick={() => setLive((value) => !value)}
            />
            <HawkButton
              label="Refresh"
              variant="outline"
              startIcon={IconRefresh}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-hawk-9 px-hawk-pad pb-hawk-9">
        {query.error ? (
          <HawkErrorState
            title="Could not load technical metrics"
            description={query.error.errorMessage ?? 'The request failed.'}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            <ServiceHealthSection data={query.data} isLoading={query.isLoading} />
            <EventingSection data={query.data} isLoading={query.isLoading} />
            <IntegrationsSection data={query.data} isLoading={query.isLoading} />
            <ApiAuthSection data={query.data} isLoading={query.isLoading} />
            <PlatformStateSection data={query.data} isLoading={query.isLoading} />

            <HawkText variant="caption" ink="disabled" className="leading-snug">
              Per-request latency and worker heartbeats are out of scope: neither is persisted
              today, and an invented p95 would be worse than none.
            </HawkText>
          </>
        )}
      </div>
    </>
  );
}
