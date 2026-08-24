import {
  HawkAdminPanel,
  HawkBarChart,
  HawkCallout,
  HawkCaption,
  HawkDonutChart,
  HawkEmptyState,
  HawkKeyValue,
  HawkProgressBar,
  HawkSemantic,
  HawkStatCompact,
  HawkText,
  cn,
  quartet,
} from '@ohlify/hawk-ui';
import type { AdminDashboard } from '@ohlify/api';

import {
  ChartSkeleton,
  DonutSkeleton,
  RowsSkeleton,
} from '../../../shared/parts/board-skeletons.js';
import {
  toOsSpread,
  toPlatformSplit,
  toTopDevices,
  toVersionAdoption,
  type VersionAdoption,
} from './dashboard-adapters.js';

/**
 * Platform and client reach.
 *
 * Auth health used to live here and now sits on the technical dashboard: login
 * outcomes and OTP exhaustion are diagnostics, and this board answers "who is
 * on what, and can we reach them?".
 *
 * The data is real rather than aspirational — the Flutter app's
 * `DeviceInfoService` sends platform, app version, device model and OS version
 * on sign-in, registration and push-token registration, and `auth_sessions`
 * carries a partial index on `(platform, app_version) WHERE revoked_at IS NULL`
 * built for exactly these queries. Sessions predating that telemetry come back
 * labelled `unknown`, which is honest and worth leaving visible.
 */
export function PlatformSection({
  data,
  isLoading,
}: {
  data: AdminDashboard | undefined;
  isLoading: boolean;
}) {
  const loading = isLoading || !data;

  return (
    <section aria-label="Platform and clients" className="flex flex-col gap-hawk-5">
      <HawkText variant="label" ink="strong" className="font-semibold">
        Platform &amp; clients
      </HawkText>

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Sessions by platform">
          {loading ? (
            <DonutSkeleton />
          ) : (
            <div className="flex justify-center">
              <HawkDonutChart data={toPlatformSplit(data)} size={128} thickness={18} />
            </div>
          )}
        </HawkAdminPanel>

        <HawkAdminPanel title="App version adoption" className="lg:col-span-2">
          {loading ? <RowsSkeleton rows={5} /> : <VersionAdoptionList data={data} />}
        </HawkAdminPanel>
      </div>

      <div className="grid gap-hawk-6 lg:grid-cols-2">
        <HawkAdminPanel title="OS versions">
          {loading ? (
            <ChartSkeleton height={170} />
          ) : (
            <HawkBarChart
              data={toOsSpread(data)}
              horizontal
              height={170}
              semantic={HawkSemantic.INFO}
            />
          )}
        </HawkAdminPanel>

        <HawkAdminPanel
          title="Top devices"
          actions={<HawkCaption ink="muted">auth_sessions.device_model</HawkCaption>}
        >
          {loading ? (
            <ChartSkeleton height={170} />
          ) : toTopDevices(data).length === 0 ? (
            <HawkEmptyState
              title="No device data"
              description="No live session reported a device model."
            />
          ) : (
            <HawkBarChart
              data={toTopDevices(data)}
              horizontal
              height={170}
              semantic={HawkSemantic.NEUTRAL}
            />
          )}
        </HawkAdminPanel>
      </div>

      <HawkAdminPanel title="Push reachability">
        {loading ? <RowsSkeleton rows={4} /> : <PushReach data={data} />}
      </HawkAdminPanel>
    </section>
  );
}

/**
 * Version adoption with the forced-upgrade cut-off made visible.
 *
 * The number an operator actually wants before raising
 * `app_versions.min_version` is "how many people would this lock out?" — so
 * the below-minimum rows are toned and totalled rather than left to be added
 * up by eye.
 */
function VersionAdoptionList({ data }: { data: AdminDashboard }) {
  const entries: VersionAdoption[] = toVersionAdoption(data);
  const total = entries.reduce((sum, entry) => sum + entry.sessions, 0);
  const stranded = entries
    .filter((entry) => entry.belowMinimum)
    .reduce((sum, entry) => sum + entry.sessions, 0);
  const caution = quartet(HawkSemantic.CAUTION);

  if (entries.length === 0) {
    return <HawkEmptyState title="No live sessions" description="Nothing to report." />;
  }

  return (
    <div className="flex flex-col gap-hawk-5">
      <div className="flex flex-col gap-hawk-4">
        {entries.map((entry) => {
          const share = total === 0 ? 0 : entry.sessions / total;
          return (
            <div key={`${entry.platform}-${entry.version}`} className="flex flex-col gap-hawk-2">
              <div className="flex items-baseline justify-between gap-hawk-4">
                <span className="flex items-baseline gap-hawk-3">
                  <HawkText
                    variant="label"
                    record
                    className={cn(entry.belowMinimum && caution.text)}
                  >
                    {entry.version}
                  </HawkText>
                  <HawkCaption ink="muted">{entry.platform}</HawkCaption>
                  {entry.belowMinimum && (
                    <HawkCaption className={caution.text}>below minimum</HawkCaption>
                  )}
                </span>
                <HawkCaption ink="muted" className="hawk-record">
                  {entry.sessions.toLocaleString()} · {(share * 100).toFixed(0)}%
                </HawkCaption>
              </div>
              <HawkProgressBar
                value={share}
                height={6}
                semantic={entry.belowMinimum ? HawkSemantic.CAUTION : HawkSemantic.SUCCESS}
              />
            </div>
          );
        })}
      </div>

      {stranded > 0 && (
        <HawkCallout
          semantic={HawkSemantic.CAUTION}
          message={`Raising the minimum would lock out ${stranded.toLocaleString()} live sessions (${(
            (stranded / total) *
            100
          ).toFixed(0)}%) until they update.`}
        />
      )}
    </div>
  );
}

/**
 * Registered push tokens against active users.
 *
 * A gap here is silent: pushes do not error, they simply never arrive, and
 * nothing else on the platform would report it.
 */
function PushReach({ data }: { data: AdminDashboard }) {
  const { registered_tokens: tokens, active_users: active } = data.platform.push;
  const ratio = active === 0 ? 0 : tokens / active;
  const unreachable = Math.max(0, active - tokens);

  return (
    <div className="flex flex-col gap-hawk-4">
      <HawkStatCompact label="Reachable" value={`${(ratio * 100).toFixed(0)}%`} />
      <HawkProgressBar
        value={Math.min(1, ratio)}
        height={8}
        semantic={ratio > 0.9 ? HawkSemantic.SUCCESS : HawkSemantic.CAUTION}
      />
      <HawkKeyValue label="Registered tokens" value={tokens.toLocaleString()} record />
      <HawkKeyValue label="Active users" value={active.toLocaleString()} record />
      <HawkKeyValue label="Unreachable" value={unreachable.toLocaleString()} record />
      <HawkCaption ink="muted" className="leading-snug">
        Users with no live device token cannot receive a push. The failure is silent — nothing
        errors, the notification simply never arrives.
      </HawkCaption>
    </div>
  );
}
