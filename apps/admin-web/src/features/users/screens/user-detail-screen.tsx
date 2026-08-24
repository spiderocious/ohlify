import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AdminRole, type AdminUserDetail } from '@ohlify/api';
import {
  HawkAdminPageHeader,
  HawkAvatar,
  HawkBadge,
  HawkBreadcrumb,
  HawkButton,
  HawkCaption,
  HawkDot,
  HawkErrorState,
  HawkIconButton,
  HawkSemantic,
  HawkSkeleton,
  HawkSkeletonLine,
  HawkStatusBadge,
  HawkTabs,
  HawkText,
  IconCopy,
  IconLogOut,
  IconShield,
  IconUser,
} from '@ohlify/hawk-ui';

import { useCurrentAdmin } from '../../../shared/auth/use-current-admin.js';
import { confirm, promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { KpiStripSkeleton, RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { ADMIN_ROUTES } from '../../../shared/routes/admin-routes.js';
import {
  useAdminUser,
  useBlockUser,
  useImpersonateUser,
  useResetUserPassword,
  useSuspendUser,
  useUnblockUser,
  useUnsuspendUser,
} from '../api/use-users.js';
import { UserActivityTab } from '../parts/user-activity-tab.js';
import { displayName } from '../parts/user-adapters.js';
import { UserMoneyTab } from '../parts/user-money-tab.js';
import { UserOverviewTab } from '../parts/user-overview-tab.js';
import { UserSecurityTab } from '../parts/user-security-tab.js';
import { UserTrustTab } from '../parts/user-trust-tab.js';
import { relativeTime, statusFor } from '../parts/user-status.js';

/**
 * One user, in full.
 *
 * Five tabs, each holding the answer to one class of support question:
 *
 *   **Overview** — is this account in trouble, what is it worth, who is it
 *   **Money** — the ledger view (finance and admin only)
 *   **Activity** — calls, reviews, chat volume, tickets
 *   **Trust** — KYC, strikes, reports, operator actions
 *   **Security** — sessions, devices, the auth trail
 *
 * Tabs rather than accordions because an operator returns to the same tab
 * repeatedly for the same kind of ticket, and a tab remembers where they were
 * in a way a scroll position does not.
 */

type UserTab = 'overview' | 'money' | 'activity' | 'trust' | 'security';

export function UserDetailScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const [tab, setTab] = useState<UserTab>('overview');
  const admin = useCurrentAdmin();
  const query = useAdminUser(id);
  const user = query.data;

  // The money tab reads the ledger, which is finance-gated on the backend —
  // the service returns `money: null` for other roles, so offering the tab
  // would open an empty one.
  const canViewMoney =
    admin?.role === AdminRole.ADMIN || admin?.role === AdminRole.FINANCE_OPS;

  const tabs = [
    { value: 'overview' as const, label: 'Overview' },
    ...(canViewMoney ? [{ value: 'money' as const, label: 'Money' }] : []),
    { value: 'activity' as const, label: 'Activity' },
    {
      value: 'trust' as const,
      label: 'Trust',
      ...(user && user.vitals.active_strikes > 0
        ? { count: user.vitals.active_strikes }
        : {}),
    },
    { value: 'security' as const, label: 'Security' },
  ];

  if (query.error) {
    return (
      <div className="px-hawk-pad py-hawk-9">
        <HawkErrorState
          title="Could not load this user"
          description={query.error.errorMessage ?? 'The request failed.'}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  return (
    <>
      <HawkAdminPageHeader
        breadcrumb={
          <HawkBreadcrumb
            items={[
              { label: 'Users', href: ADMIN_ROUTES.USERS.absPath },
              { label: user ? displayName(user) : 'User' },
            ]}
            as={Link}
          />
        }
        title={user ? <IdentityHero user={user} /> : <HeroSkeleton />}
        actions={user ? <UserActions user={user} onShowSessions={() => setTab('security')} /> : null}
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        <HawkTabs tabs={tabs} value={tab} onChange={setTab} />

        {!user ? (
          <div className="flex flex-col gap-hawk-6">
            <KpiStripSkeleton />
            <RowsSkeleton rows={8} />
          </div>
        ) : (
          <>
            {tab === 'overview' && <UserOverviewTab user={user} />}
            {tab === 'money' && canViewMoney && <UserMoneyTab user={user} />}
            {tab === 'activity' && <UserActivityTab user={user} />}
            {tab === 'trust' && <UserTrustTab user={user} />}
            {tab === 'security' && <UserSecurityTab user={user} />}
          </>
        )}
      </div>
    </>
  );
}

function HeroSkeleton() {
  return (
    <div className="flex items-center gap-hawk-5">
      <HawkSkeleton width={56} height={56} circle />
      <div className="flex flex-col gap-hawk-2">
        <HawkSkeletonLine widthFactor={0.5} height={20} />
        <HawkSkeletonLine widthFactor={0.8} height={11} />
      </div>
    </div>
  );
}

/**
 * The identity hero.
 *
 * Avatar, name, handle, and the two badges that decide what an operator can do
 * next — account status and KYC. Everything else waits for a tab; these four
 * facts are the ones needed before reading anything at all.
 */
function IdentityHero({ user }: { user: AdminUserDetail }) {
  const display = displayName(user);
  const online =
    user.last_seen_at !== null && Date.now() - new Date(user.last_seen_at).getTime() < 300_000;

  return (
    <div className="flex flex-wrap items-center gap-hawk-5">
      <HawkAvatar
        name={display}
        size="lg"
        {...(user.avatar_url ? { src: user.avatar_url } : {})}
      />
      <div className="flex min-w-0 flex-col gap-hawk-2">
        <span className="flex flex-wrap items-center gap-hawk-3">
          <HawkText variant="header" ink="strong" as="h1">
            {display}
          </HawkText>
          {user.handle && (
            <HawkCaption ink="muted" className="hawk-record">
              @{user.handle}
            </HawkCaption>
          )}
          {online && (
            <span className="flex items-center gap-hawk-2">
              <HawkDot semantic={HawkSemantic.SUCCESS} size={7} pulse />
              <HawkCaption className="text-hawk-success">Online</HawkCaption>
            </span>
          )}
        </span>

        <span className="flex flex-wrap items-center gap-hawk-3">
          <HawkBadge
            label={user.role === 'professional' ? 'Professional' : 'Client'}
            semantic={user.role === 'professional' ? HawkSemantic.INFO : HawkSemantic.NEUTRAL}
            size="sm"
          />
          <HawkStatusBadge status={statusFor('user', user.status)} size="sm" />
          <HawkStatusBadge status={statusFor('kyc', user.kyc_status)} size="sm" />
          <HawkCaption ink="disabled" className="hawk-record">
            {user.email} · seen {relativeTime(user.last_seen_at)}
          </HawkCaption>
        </span>
      </div>
    </div>
  );
}

/**
 * The action rail.
 *
 * All six actions are visible: an operator on this screen is here to *do*
 * something, and hiding two-thirds behind a chevron makes every task a click
 * longer. What the layout adds is *weight* — reset-password and suspend are
 * the everyday pair and lead; block sits apart, after a divider, styled
 * destructive, because it is the one that is hard to undo.
 *
 * Every action takes a typed reason and lands in the audit log with the
 * operator's identity. Impersonation especially — it is the most invasive
 * thing this console can do.
 */
function UserActions({
  user,
  onShowSessions,
}: {
  user: AdminUserDetail;
  onShowSessions: () => void;
}) {
  const suspend = useSuspendUser(user.id);
  const unsuspend = useUnsuspendUser(user.id);
  const block = useBlockUser(user.id);
  const unblock = useUnblockUser(user.id);
  const resetPassword = useResetUserPassword(user.id);
  const impersonate = useImpersonateUser(user.id);

  const isSuspended = user.status === 'suspended';
  const isBlocked = user.status === 'blocked';

  // One in-flight action at a time. Two overlapping status writes would race,
  // and the loser's response would overwrite the winner's in the cache.
  const busy =
    suspend.isPending ||
    unsuspend.isPending ||
    block.isPending ||
    unblock.isPending ||
    resetPassword.isPending ||
    impersonate.isPending;

  const handleSuspend = async () => {
    const reason = await promptForReason({
      title: 'Suspend user',
      message: 'Suspended users cannot sign in until you unsuspend them. Provide a reason.',
    });
    if (!reason) return;
    suspend.mutate(
      { reason },
      { onSuccess: () => toastSuccess('User suspended'), onError: (err) => toastError(err) },
    );
  };

  const handleUnsuspend = async () => {
    if (!(await confirm({ title: 'Unsuspend user?', message: 'They can sign in again.' }))) return;
    unsuspend.mutate(
      { note: 'unsuspend via admin' },
      { onSuccess: () => toastSuccess('User unsuspended'), onError: (err) => toastError(err) },
    );
  };

  const handleBlock = async () => {
    const reason = await promptForReason({
      title: 'Block user',
      message: 'Block is harsher than suspend — for fraud or ToS violations.',
    });
    if (!reason) return;
    block.mutate(
      { reason },
      { onSuccess: () => toastSuccess('User blocked'), onError: (err) => toastError(err) },
    );
  };

  const handleUnblock = async () => {
    if (!(await confirm({ title: 'Unblock user?', message: 'Reinstates the user to active.' })))
      return;
    unblock.mutate(
      { note: 'unblock via admin' },
      { onSuccess: () => toastSuccess('User unblocked'), onError: (err) => toastError(err) },
    );
  };

  const handleResetPassword = async () => {
    const note = await promptForReason({
      title: 'Reset password',
      message: 'Emails the user a reset link. Provide a reason for the audit log.',
    });
    if (!note) return;
    // `send_email` and `note` are both required by the backend's strict schema
    // — the old `{ notify }` payload 400'd every reset. (BUGS.md B5.)
    resetPassword.mutate(
      { send_email: true, note },
      { onSuccess: () => toastSuccess('Reset email sent'), onError: (err) => toastError(err) },
    );
  };

  const handleImpersonate = async () => {
    const reason = await promptForReason({
      title: 'Impersonate user',
      message: 'Heavily audit-logged. Provide a reason linked to a support ticket.',
    });
    if (!reason) return;
    impersonate.mutate(
      { reason },
      {
        onSuccess: () => toastSuccess('Impersonation token issued — check audit log'),
        onError: (err) => toastError(err),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-hawk-3">
      <HawkIconButton
        icon={IconCopy}
        label="Copy user ID"
        variant="plain"
        onClick={() => {
          void navigator.clipboard?.writeText(user.id);
          toastSuccess('User ID copied');
        }}
      />

      <HawkButton
        label="Reset password"
        variant="outline"
        loading={resetPassword.isPending}
        disabled={busy && !resetPassword.isPending}
        onClick={() => void handleResetPassword()}
      />

      <HawkButton
        label="Revoke sessions"
        variant="outline"
        startIcon={IconLogOut}
        onClick={onShowSessions}
      />

      <HawkButton
        label="Impersonate"
        variant="outline"
        startIcon={IconUser}
        loading={impersonate.isPending}
        disabled={busy && !impersonate.isPending}
        onClick={() => void handleImpersonate()}
      />

      {isSuspended ? (
        <HawkButton
          label="Unsuspend"
          loading={unsuspend.isPending}
          disabled={busy && !unsuspend.isPending}
          onClick={() => void handleUnsuspend()}
        />
      ) : (
        <HawkButton
          label="Suspend"
          variant="outline"
          startIcon={IconShield}
          loading={suspend.isPending}
          disabled={busy && !suspend.isPending}
          onClick={() => void handleSuspend()}
        />
      )}

      {/* The divider is the whole point: block is not a peer of the others. */}
      <span aria-hidden="true" className="mx-hawk-2 h-6 w-px bg-hawk-line" />

      {isBlocked ? (
        <HawkButton
          label="Unblock"
          loading={unblock.isPending}
          disabled={busy && !unblock.isPending}
          onClick={() => void handleUnblock()}
        />
      ) : (
        <HawkButton
          label="Block"
          variant="outline"
          destructive
          loading={block.isPending}
          disabled={busy && !block.isPending}
          onClick={() => void handleBlock()}
        />
      )}
    </div>
  );
}
