import { useNavigate, useParams } from 'react-router-dom';

import { AppButton, AppText } from '@ohlify/ui';
import { AdminUserStatus } from '@ohlify/api';

import { Avatar } from '../../../shared/parts/avatar.js';
import { BackLink } from '../../../shared/parts/back-link.js';
import { DetailRow } from '../../../shared/parts/detail-row.js';
import { FilePreview } from '../../../shared/parts/file-preview.js';
import { InfoCard } from '../../../shared/parts/info-card.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { confirm, promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatDuration } from '../../../shared/format/datetime.js';
import { formatKobo } from '../../../shared/format/kobo.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
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
import { KycStatusPill, UserStatusPill } from '../parts/user-status-pill.js';

export function UserDetailScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detail = useAdminUser(id);
  const suspend = useSuspendUser(id);
  const unsuspend = useUnsuspendUser(id);
  const block = useBlockUser(id);
  const unblock = useUnblockUser(id);
  const resetPw = useResetUserPassword(id);
  const impersonate = useImpersonateUser(id);

  const user = detail.data;
  const isSuspended = user?.status === AdminUserStatus.SUSPENDED;
  const isBlocked = user?.status === AdminUserStatus.BLOCKED;
  const isProfessional = user?.role === 'professional';

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
    if (
      !(await confirm({
        title: 'Reset password?',
        message: 'A password-reset email will be sent.',
      }))
    )
      return;
    resetPw.mutate(
      { send_email: true, note: 'Password reset requested from admin user detail.' },
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
    <>
      <PageHeader
        topSlot={<BackLink to={ADMIN_ROUTES.USERS.absPath} label="All users" />}
        title={user?.full_name ?? user?.email ?? `User ${shortId(id, 12)}`}
        subtitle={user?.email ?? undefined}
        actions={
          user ? (
            <>
              <AppButton
                label="Reset password"
                variant="outline"
                height={36}
                onPressed={handleResetPassword}
              />
              <AppButton
                label="Impersonate"
                variant="outline"
                height={36}
                onPressed={handleImpersonate}
              />
              {isSuspended ? (
                <AppButton
                  label="Unsuspend"
                  variant="solid"
                  height={36}
                  onPressed={handleUnsuspend}
                />
              ) : (
                <AppButton
                  label="Suspend"
                  variant="outline"
                  height={36}
                  onPressed={handleSuspend}
                />
              )}
              {isBlocked ? (
                <AppButton label="Unblock" variant="solid" height={36} onPressed={handleUnblock} />
              ) : (
                <AppButton label="Block" variant="outline" height={36} onPressed={handleBlock} />
              )}
            </>
          ) : null
        }
      />

      <div className="px-4 py-6 sm:px-6">
        <QueryView isLoading={detail.isLoading} error={detail.error}>
          {user && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {/* Left column */}
              <div className="flex flex-col gap-4 xl:col-span-2">
                <InfoCard title="Identity">
                  <div className="flex items-center gap-4">
                    <Avatar fileKey={user.avatar_url} name={user.full_name} size={64} />
                    <div className="min-w-0 flex-1">
                      <AppText variant="bodyTitle" className="text-text-primary">
                        {user.full_name ?? '—'}
                      </AppText>
                      <AppText variant="bodySmall" className="text-text-muted">
                        {user.email}
                      </AppText>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <UserStatusPill status={user.status} />
                        <KycStatusPill status={user.kyc_status} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2">
                    <DetailRow label="ID">{shortId(user.id, 18)}</DetailRow>
                    <DetailRow label="Handle">{user.handle ?? '—'}</DetailRow>
                    <DetailRow label="Role">
                      {user.role ? humanizeStatus(user.role) : '—'}
                    </DetailRow>
                    <DetailRow label="Phone">{user.phone_number ?? '—'}</DetailRow>
                    <DetailRow label="Email verified">
                      {user.email_verified_at ? formatDateTime(user.email_verified_at) : 'No'}
                    </DetailRow>
                    <DetailRow label="Phone verified">
                      {user.phone_verified_at ? formatDateTime(user.phone_verified_at) : 'No'}
                    </DetailRow>
                    <DetailRow label="Created">{formatDateTime(user.created_at)}</DetailRow>
                    <DetailRow label="Last seen">{formatDateTime(user.last_seen_at)}</DetailRow>
                    <DetailRow label="Suspended until">
                      {user.suspended_until ? formatDateTime(user.suspended_until) : '—'}
                    </DetailRow>
                  </div>
                </InfoCard>

                {isProfessional && (
                  <InfoCard title="Professional profile">
                    <DetailRow label="Occupation">{user.occupation ?? '—'}</DetailRow>
                    <DetailRow label="Description">
                      <span className="whitespace-pre-wrap text-text-primary">
                        {user.description ?? '—'}
                      </span>
                    </DetailRow>
                  </InfoCard>
                )}

                {user.kyc_submission && (
                  <InfoCard title="KYC submission">
                    <DetailRow label="Submission ID">
                      {shortId(user.kyc_submission.id, 18)}
                    </DetailRow>
                    <DetailRow label="Type">
                      {humanizeStatus(user.kyc_submission.identity_type ?? '')}
                    </DetailRow>
                    <DetailRow label="Number">
                      <code>{user.kyc_submission.identity_number ?? '—'}</code>
                    </DetailRow>
                    <DetailRow label="Status">
                      <KycStatusPill status={user.kyc_submission.status} />
                    </DetailRow>
                    <DetailRow label="Reviewed at">
                      {formatDateTime(user.kyc_submission.reviewed_at)}
                    </DetailRow>
                    <DetailRow label="Reject reason">
                      {user.kyc_submission.reject_reason_code ?? '—'}
                    </DetailRow>
                    <DetailRow label="Reject note">
                      {user.kyc_submission.reject_note ?? '—'}
                    </DetailRow>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <AppText
                          variant="bodySmall"
                          className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted"
                        >
                          Identity document
                        </AppText>
                        <FilePreview
                          fileKey={user.kyc_submission.document_upload_id}
                          label="Identity document"
                          height={220}
                        />
                      </div>
                      <div>
                        <AppText
                          variant="bodySmall"
                          className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted"
                        >
                          Selfie
                        </AppText>
                        <FilePreview
                          fileKey={user.kyc_submission.selfie_upload_key}
                          label="Selfie"
                          height={220}
                        />
                      </div>
                    </div>
                  </InfoCard>
                )}

                {(user.recent_calls_as_caller?.length ?? 0) +
                  (user.recent_calls_as_callee?.length ?? 0) >
                  0 && (
                  <InfoCard title="Recent calls">
                    <ul className="flex flex-col">
                      {[
                        ...(user.recent_calls_as_caller ?? []),
                        ...(user.recent_calls_as_callee ?? []),
                      ]
                        .slice(0, 12)
                        .map((c) => (
                          <li
                            key={c.id}
                            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border/60 py-2 text-sm last:border-b-0"
                          >
                            <code className="font-mono text-xs text-text-muted">
                              {shortId(c.id, 14)}
                            </code>
                            <div className="min-w-0">
                              <span className="font-medium text-text-primary">
                                {humanizeStatus(c.status)}
                              </span>
                              <span className="ml-2 text-text-muted">
                                {formatDuration(c.connected_seconds)}
                              </span>
                            </div>
                            <span className="text-text-muted">{formatDateTime(c.start_at)}</span>
                          </li>
                        ))}
                    </ul>
                  </InfoCard>
                )}

                {user.recent_transactions && user.recent_transactions.length > 0 && (
                  <InfoCard title="Recent ledger entries">
                    <ul className="flex flex-col">
                      {user.recent_transactions.map((t) => (
                        <li
                          key={t.journal_id}
                          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border/60 py-2 text-sm last:border-b-0"
                        >
                          <div className="min-w-0">
                            <div className="text-text-primary">{humanizeStatus(t.kind)}</div>
                            {t.memo && (
                              <div className="truncate text-xs text-text-muted">{t.memo}</div>
                            )}
                          </div>
                          <span
                            className={
                              'font-semibold tabular-nums ' +
                              (Number(t.signed_amount_kobo) >= 0
                                ? 'text-emerald-700'
                                : 'text-red-700')
                            }
                          >
                            {formatKobo(t.signed_amount_kobo, { signed: true })}
                          </span>
                          <span className="text-xs text-text-muted">
                            {formatDateTime(t.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                )}
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4">
                <InfoCard
                  title="Wallet"
                  actions={
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() =>
                        navigate(ADMIN_ROUTES.WALLETS.USER_WALLET.build({ userId: user.id }))
                      }
                    >
                      Open ledger ↗
                    </button>
                  }
                >
                  <DetailRow label="Available">
                    <AppText variant="bodyTitle" className="text-text-primary">
                      {formatKobo(user.wallet?.available_kobo)}
                    </AppText>
                  </DetailRow>
                  <DetailRow label="Pending">{formatKobo(user.wallet?.pending_kobo)}</DetailRow>
                  <DetailRow label="Currency">{user.wallet?.currency ?? '—'}</DetailRow>
                </InfoCard>

                {user.bank_account && (
                  <InfoCard title="Bank account">
                    <DetailRow label="Bank">{user.bank_account.bank_name}</DetailRow>
                    <DetailRow label="Last 4">{user.bank_account.account_number_last4}</DetailRow>
                    <DetailRow label="Account name">{user.bank_account.account_name}</DetailRow>
                    <DetailRow label="Added">
                      {formatDateTime(user.bank_account.added_at)}
                    </DetailRow>
                  </InfoCard>
                )}

                <InfoCard title="Flags">
                  <DetailRow label="Reports against">
                    {user.flags?.active_reports_against ?? 0}
                  </DetailRow>
                  <DetailRow label="Failed payouts (30d)">
                    {user.flags?.failed_payouts_30d ?? 0}
                  </DetailRow>
                </InfoCard>
              </div>
            </div>
          )}
        </QueryView>
      </div>
    </>
  );
}
