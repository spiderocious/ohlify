import { useMemo, useState } from 'react';

import { AdminRole } from '@ohlify/api';
import {
  HawkAdminPageHeader,
  HawkButton,
  HawkCaption,
  HawkErrorState,
  IconDownload,
} from '@ohlify/hawk-ui';

import { useCurrentAdmin } from '../../../shared/auth/use-current-admin.js';
import { useDashboard } from '../api/use-dashboard.js';
import { AttentionBand } from '../parts/attention-band.js';
import { CallsSection } from '../parts/calls-section.js';
import { toAttentionSignals } from '../parts/dashboard-adapters.js';
import { DashboardRange, RANGE_SPECS, RANGE_TIMEZONE_NOTE } from '../parts/dashboard-range.js';
import { GrowthSection } from '../parts/growth-section.js';
import { MoneySection } from '../parts/money-section.js';
import { PlatformSection } from '../parts/platform-section.js';
import { RangeFilter } from '../parts/range-filter.js';
import { TrustSection } from '../parts/trust-section.js';

/**
 * The operator's landing surface.
 *
 * Ordered by urgency descending, which is the one design decision everything
 * else follows from. An operator opening this at 9am needs "is anything
 * broken?" before "how did we do?" — so the attention band sits above revenue,
 * and moderation sits at the bottom. Revenue is never urgent; a payment that
 * never credited is.
 *
 * One request feeds every section. Nine separate calls would add nine chances
 * to fail and leave the board half-drawn, and sections fetched across a bucket
 * boundary would disagree with each other.
 *
 * Nothing here sets a size or a radius: `HawkAdminShell` opens a BOARD
 * register zone, so every panel, chart and control resolves to the dense scale
 * from that one ancestor.
 */
export function DashboardScreen() {
  const [range, setRange] = useState<DashboardRange>(DashboardRange.WEEK);
  const admin = useCurrentAdmin();
  const query = useDashboard(range);

  // Revenue is finance-gated on the backend, and support can reach this page.
  // The service already omits the money block for them — this keeps the whole
  // section out of the layout rather than rendering an explanatory box on a
  // board they read every day.
  const canViewMoney =
    admin?.role === AdminRole.ADMIN || admin?.role === AdminRole.FINANCE_OPS;

  const attentionSignals = useMemo(
    () => (query.data ? toAttentionSignals(query.data) : []),
    [query.data],
  );

  return (
    <>
      <HawkAdminPageHeader
        title="Dashboard"
        subtitle={
          <span className="flex flex-wrap items-center gap-hawk-3">
            <span>{RANGE_SPECS[range].label}</span>
            <span aria-hidden="true">·</span>
            {/*
              The buckets are server-time. Lagos is UTC+1, so "today" ends at
              1am local — a real trap for anyone reading a late-evening number,
              and cheaper to state than to have someone discover.
            */}
            <span className="hawk-record">{RANGE_TIMEZONE_NOTE}</span>
            {query.isFetching && !query.isLoading && (
              <>
                <span aria-hidden="true">·</span>
                <HawkCaption ink="disabled">updating…</HawkCaption>
              </>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-hawk-4">
            <RangeFilter value={range} onChange={setRange} />
            <HawkButton
              label="Export"
              variant="outline"
              startIcon={IconDownload}
              onClick={() => {}}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-hawk-9 px-hawk-pad pb-hawk-9">
        {query.error ? (
          // One failure takes the whole board, because every section comes from
          // the same request — rendering five empty panels would suggest the
          // platform was idle rather than that the request failed.
          <HawkErrorState
            title="Could not load the dashboard"
            description={query.error.errorMessage ?? 'The metrics request failed.'}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            <AttentionBand signals={attentionSignals} isLoading={query.isLoading} />

            {canViewMoney && (
              <MoneySection data={query.data} isLoading={query.isLoading} range={range} />
            )}

            <CallsSection data={query.data} isLoading={query.isLoading} range={range} />

            <GrowthSection data={query.data} isLoading={query.isLoading} range={range} />

            <PlatformSection data={query.data} isLoading={query.isLoading} />

            <TrustSection data={query.data} isLoading={query.isLoading} />
          </>
        )}
      </div>
    </>
  );
}
