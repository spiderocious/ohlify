import {
  HawkAdminPanel,
  HawkAuditLog,
  HawkBarChart,
  HawkCaption,
  HawkEmptyState,
  HawkKeyValue,
  HawkSemantic,
  HawkStatCompact,
  HawkText,
} from '@ohlify/hawk-ui';
import type { AdminDashboard } from '@ohlify/api';

import {
  ChartSkeleton,
  RowsSkeleton,
  TableSkeleton,
} from '../../../shared/parts/board-skeletons.js';
import { formatAge, toActionsByAdmin, toReportReasons } from './dashboard-adapters.js';

/**
 * Trust, moderation, and who has been operating the platform.
 *
 * Last on the page by design. None of it is urgent — the urgent slice of
 * moderation (reports waiting too long) is already surfaced in the attention
 * band at the top, and repeating it here would train people to read the same
 * number twice.
 */
export function TrustSection({
  data,
  isLoading,
}: {
  data: AdminDashboard | undefined;
  isLoading: boolean;
}) {
  const loading = isLoading || !data;
  const oldest = loading ? undefined : formatAge(data.trust.reports_oldest_seconds);

  return (
    <section aria-label="Trust and moderation" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        Trust &amp; moderation
      </HawkText>

      <div className="grid gap-hawk-6 lg:grid-cols-2">
        <HawkAdminPanel
          title="Reports"
          actions={
            oldest ? (
              <HawkCaption ink="muted" className="hawk-record">
                {oldest}
              </HawkCaption>
            ) : undefined
          }
        >
          {loading ? (
            <RowsSkeleton rows={4} />
          ) : (
            <div className="flex flex-col gap-hawk-5">
              <div className="grid grid-cols-2 gap-hawk-5">
                <HawkStatCompact label="Awaiting review" value={data.trust.reports_pending} />
                <HawkStatCompact
                  label="Users actioned"
                  value={data.trust.users_suspended + data.trust.users_blocked}
                />
              </div>
              {toReportReasons(data).length === 0 ? (
                <HawkEmptyState
                  title="No reports"
                  description="Nothing was reported in this period."
                />
              ) : (
                <HawkBarChart
                  data={toReportReasons(data)}
                  horizontal
                  height={140}
                  semantic={HawkSemantic.CAUTION}
                />
              )}
            </div>
          )}
        </HawkAdminPanel>

        <HawkAdminPanel title="Actions by operator">
          {loading ? (
            <ChartSkeleton height={150} />
          ) : toActionsByAdmin(data).length === 0 ? (
            <HawkEmptyState
              title="No operator actions"
              description="Nothing was actioned in this period."
            />
          ) : (
            <HawkBarChart
              data={toActionsByAdmin(data)}
              horizontal
              height={150}
              semantic={HawkSemantic.INFO}
            />
          )}
        </HawkAdminPanel>
      </div>

      <HawkAdminPanel title="Reviews">
        {loading ? (
          <RowsSkeleton rows={4} />
        ) : (
          <div className="grid gap-hawk-4 sm:grid-cols-2 lg:grid-cols-4">
            <HawkStatCompact
              label="Average rating"
              // Null means no review landed — not zero stars.
              value={data.trust.average_rating === null ? '—' : data.trust.average_rating.toFixed(2)}
            />
            <HawkKeyValue
              label="Reviews in period"
              value={data.trust.reviews_in_period.toLocaleString()}
              record
            />
            <HawkKeyValue label="Suspended users" value={data.trust.users_suspended} record />
            <HawkKeyValue label="Blocked users" value={data.trust.users_blocked} record />
          </div>
        )}
      </HawkAdminPanel>

      {/*
        `flush` — the log draws its own row rules, so panel padding would inset
        them and break their alignment with the panel header.
      */}
      <HawkAdminPanel title="Recent operator activity" flush>
        {loading ? (
          <TableSkeleton rows={5} columns={3} />
        ) : (
          <HawkAuditLog
            entries={data.trust.recent_actions.map((entry) => ({
              id: entry.id,
              actor: entry.actor,
              action: entry.action.replace(/[._]/g, ' '),
              ...(entry.target_id ? { target: entry.target_id } : {}),
              timestamp: new Date(entry.created_at).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC',
              }),
              // Money-moving actions are the ones a reader scanning the log
              // must not skim past.
              highGravity: /wallet|withdraw|refund|journal|credit|debit/.test(entry.action),
            }))}
          />
        )}
      </HawkAdminPanel>
    </section>
  );
}
