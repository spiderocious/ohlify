import {
  HawkAdminPanel,
  HawkBadge,
  HawkButton,
  HawkCallout,
  HawkCaption,
  HawkKeyValue,
  HawkSemantic,
  HawkTable,
  HawkText,
  type HawkColumn,
} from '@ohlify/hawk-ui';

import type {
  AdminUserAuthEvent,
  AdminUserDetail,
  AdminUserDevice,
  AdminUserSession,
} from '@ohlify/api';
import { absoluteTime, relativeTime } from './user-status.js';

/**
 * Security — sessions, devices and the authentication trail.
 *
 * This tab answers one question better than anything else on the platform:
 * **"was that actually them?"** A support agent facing "someone changed my
 * password" needs an IP, a device and a timestamp, not a status field.
 */
export function UserSecurityTab({ user }: { user: AdminUserDetail }) {
  const sessionColumns: ReadonlyArray<HawkColumn<AdminUserSession>> = [
    {
      key: 'device',
      header: 'Device',
      width: '26%',
      render: (row) => (
        <div className="flex flex-col">
          <HawkText variant="label" ink="strong" className="font-medium">
            {row.device_model ?? 'Unknown device'}
          </HawkText>
          <HawkCaption ink="muted" className="hawk-record">
            {row.os_version ?? '—'}
          </HawkCaption>
        </div>
      ),
    },
    {
      key: 'platform',
      header: 'Platform',
      width: '16%',
      render: (row) => (
        <span className="flex items-center gap-hawk-2">
          <HawkBadge
            label={row.platform ?? 'unknown'}
            semantic={HawkSemantic.NEUTRAL}
            size="sm"
          />
          <HawkCaption ink="disabled" className="hawk-record">
            {row.app_version ?? ''}
          </HawkCaption>
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      width: '16%',
      render: (row) => <span className="hawk-record">{row.ip ?? '—'}</span>,
    },
    {
      key: 'created',
      header: 'Signed in',
      width: '18%',
      render: (row) => <span className="hawk-record">{absoluteTime(row.created_at)}</span>,
    },
    {
      key: 'last_used',
      header: 'Last used',
      align: 'right',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{relativeTime(row.last_used_at)}</span>
      ),
    },
  ];

  const eventColumns: ReadonlyArray<HawkColumn<AdminUserAuthEvent>> = [
    {
      key: 'when',
      header: 'When',
      width: '20%',
      render: (row) => <span className="hawk-record">{absoluteTime(row.created_at)}</span>,
    },
    {
      key: 'event',
      header: 'Event',
      width: '16%',
      render: (row) => <span className="hawk-record">{row.event.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'outcome',
      header: 'Outcome',
      width: '22%',
      render: (row) => (
        <HawkBadge
          label={row.outcome === 'success' ? 'Success' : (row.reason ?? 'Failure')}
          semantic={row.outcome === 'success' ? HawkSemantic.SUCCESS : HawkSemantic.CRITICAL}
          size="sm"
        />
      ),
    },
    {
      key: 'ip',
      header: 'Origin',
      render: (row) => (
        <span className="hawk-record">
          {row.ip ?? '—'}
          {row.platform ? ` · ${row.platform}` : ''}
        </span>
      ),
    },
  ];

  const deviceColumns: ReadonlyArray<HawkColumn<AdminUserDevice>> = [
    {
      key: 'token',
      header: 'Token',
      width: '20%',
      render: (row) => <span className="hawk-record">{row.token_suffix}</span>,
    },
    {
      key: 'platform',
      header: 'Platform',
      width: '16%',
      render: (row) => <HawkBadge label={row.platform} semantic={HawkSemantic.NEUTRAL} size="sm" />,
    },
    {
      key: 'model',
      header: 'Device',
      render: (row) => <span className="hawk-record">{row.device_model ?? '—'}</span>,
    },
    {
      key: 'version',
      header: 'App',
      width: '14%',
      render: (row) => <span className="hawk-record">{row.app_version ?? '—'}</span>,
    },
    {
      key: 'seen',
      header: 'Last seen',
      align: 'right',
      width: '18%',
      render: (row) => (
        <span className="hawk-record text-hawk-ink-muted">{relativeTime(row.last_seen_at)}</span>
      ),
    },
  ];

  // The API returns live sessions only — revoked and expired are filtered there.
  const liveSessions = user.sessions;
  const distinctIps = new Set(
    user.auth_events.map((event) => event.ip).filter((ip): ip is string => ip !== null),
  );
  const recentFailures = user.auth_events.filter((event) => event.outcome === 'failure').length;

  return (
    <div className="flex flex-col gap-hawk-6">
      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="At a glance" className="lg:col-span-2">
          <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-3">
            <HawkKeyValue label="Live sessions" value={liveSessions.length} record />
            <HawkKeyValue label="Registered devices" value={user.devices.length} record />
            <HawkKeyValue label="Distinct IPs" value={distinctIps.size} record />
          </div>
        </HawkAdminPanel>

        <HawkAdminPanel title="Session control">
          <div className="flex flex-col gap-hawk-4">
            <HawkButton
              label="Revoke all sessions"
              variant="outline"
              destructive
              block
              onClick={() => {}}
            />
            <HawkCaption ink="muted" className="leading-snug">
              Signs the user out of every device immediately. The first thing to do when an
              account is reported compromised — before resetting the password, because a
              live session survives a password change.
            </HawkCaption>
          </div>
        </HawkAdminPanel>
      </div>

      {recentFailures > 0 && (
        <HawkCallout
          semantic={HawkSemantic.CAUTION}
          title={`${recentFailures} failed sign-in ${recentFailures === 1 ? 'attempt' : 'attempts'}`}
          message="Check whether the failures and the successes came from the same address before assuming a compromise."
        />
      )}

      <HawkAdminPanel title="Active sessions" flush>
        <HawkTable
          bare
          columns={sessionColumns}
          rows={liveSessions}
          rowKey={(row) => row.id}
          emptyTitle="No live sessions"
          emptyDescription="This user is not signed in anywhere."
        />
      </HawkAdminPanel>

      <HawkAdminPanel
        title="Authentication history"
        flush
        actions={<HawkCaption ink="muted">auth_events</HawkCaption>}
      >
        <HawkTable
          columns={eventColumns}
          rows={user.auth_events}
          rowKey={(row) => row.id}
          emptyTitle="No auth events"
          emptyDescription="Nothing recorded since the log was added."
        />
      </HawkAdminPanel>

      <HawkAdminPanel
        title="Push devices"
        flush
        actions={<HawkCaption ink="muted">device_tokens</HawkCaption>}
      >
        <HawkTable
          columns={deviceColumns}
          rows={user.devices}
          rowKey={(row) => row.token_suffix}
          emptyTitle="No push devices"
          emptyDescription="No push would reach this user — the failure is silent."
        />
      </HawkAdminPanel>
    </div>
  );
}
