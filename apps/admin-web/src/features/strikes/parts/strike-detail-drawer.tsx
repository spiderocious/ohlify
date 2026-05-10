import { AppButton, AppText } from '@ohlify/ui';
import { StrikeStatus } from '@ohlify/api';

import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatDuration } from '../../../shared/format/datetime.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useStrikeDetail, useUpholdStrike, useVoidStrike } from '../api/use-strikes.js';
import { StrikeStatusPill } from './strike-status-pill.js';

interface StrikeDetailDrawerProps {
  strikeId: string | null;
  onClose: () => void;
}

export function StrikeDetailDrawer({ strikeId, onClose }: StrikeDetailDrawerProps) {
  const detail = useStrikeDetail(strikeId);
  const uphold = useUpholdStrike(strikeId ?? '');
  const voidStrike = useVoidStrike(strikeId ?? '');
  const strike = detail.data;

  const onUphold = async () => {
    if (!strike) return;
    const comment = await promptForReason({
      title: 'Uphold strike',
      message: 'Optional admin note explaining the decision.',
      placeholder: 'e.g. Verified no-show via Agora session logs',
    });
    // Backend allows empty comment; pass empty body if user cancels.
    uphold.mutate(comment ? { comment } : {}, {
      onSuccess: () => toastSuccess('Strike upheld'),
      onError: (err) => toastError(err),
    });
  };

  const onVoid = async () => {
    if (!strike) return;
    const reason = await promptForReason({
      title: 'Void strike',
      message:
        'Voiding decrements active count but does NOT auto-unsuspend the user. Reinstate via Users → Unsuspend if needed.',
      placeholder: 'e.g. User documented illness with valid medical note',
    });
    if (!reason) return;
    voidStrike.mutate(
      { reason },
      {
        onSuccess: () => toastSuccess('Strike voided'),
        onError: (err) => toastError(err),
      },
    );
  };

  // Uphold is meaningful only on a disputed strike (per backend doc).
  const canUphold = strike?.status === StrikeStatus.DISPUTED;
  // Void is allowed on active or disputed.
  const canVoid =
    strike?.status === StrikeStatus.ACTIVE || strike?.status === StrikeStatus.DISPUTED;

  return (
    <DetailDrawer
      open={Boolean(strikeId)}
      onClose={onClose}
      title={strike ? `Strike ${shortId(strike.id, 12)}` : 'Strike'}
      subtitle={strike ? humanizeStatus(strike.reason_code) : undefined}
      width={560}
      footer={
        strike ? (
          <>
            {canVoid && (
              <AppButton label="Void" variant="outline" height={36} onPressed={onVoid} />
            )}
            {canUphold && (
              <AppButton label="Uphold" variant="solid" height={36} onPressed={onUphold} />
            )}
          </>
        ) : null
      }
    >
      <QueryView isLoading={detail.isLoading} error={detail.error}>
        {strike && (
          <>
            <DetailSection title="Strike">
              <DetailRow label="ID">{shortId(strike.id, 18)}</DetailRow>
              <DetailRow label="Status">
                <StrikeStatusPill status={strike.status} />
              </DetailRow>
              <DetailRow label="Reason">{humanizeStatus(strike.reason_code)}</DetailRow>
              <DetailRow label="Description">
                <span className="whitespace-pre-wrap">{strike.description ?? '—'}</span>
              </DetailRow>
              <DetailRow label="Created">{formatDateTime(strike.created_at)}</DetailRow>
            </DetailSection>

            <DetailSection title="Subject">
              <DetailRow label="User">
                <div className="flex flex-col">
                  <span className="text-text-primary">{strike.subject?.name ?? '—'}</span>
                  <UserLink userId={strike.subject?.id} idLen={18} />
                </div>
              </DetailRow>
              <DetailRow label="Role">
                {strike.subject?.role ? humanizeStatus(strike.subject.role) : '—'}
              </DetailRow>
            </DetailSection>

            {(strike.dispute_comment || strike.disputed_at) && (
              <DetailSection title="Dispute">
                <DetailRow label="Disputed at">{formatDateTime(strike.disputed_at)}</DetailRow>
                <DetailRow label="User comment">
                  <span className="whitespace-pre-wrap">{strike.dispute_comment ?? '—'}</span>
                </DetailRow>
              </DetailSection>
            )}

            {(strike.admin_review_comment || strike.reviewed_at) && (
              <DetailSection title="Admin review">
                <DetailRow label="Reviewed at">{formatDateTime(strike.reviewed_at)}</DetailRow>
                <DetailRow label="Reviewed by">
                  {strike.reviewed_by_admin_id ? (
                    <UserLink userId={strike.reviewed_by_admin_id} idLen={18} />
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="Comment">
                  <span className="whitespace-pre-wrap">{strike.admin_review_comment ?? '—'}</span>
                </DetailRow>
              </DetailSection>
            )}

            {strike.related_call && (
              <DetailSection title="Related call">
                <DetailRow label="ID">{shortId(strike.related_call.id, 18)}</DetailRow>
                <DetailRow label="Type">{humanizeStatus(strike.related_call.call_type)}</DetailRow>
                <DetailRow label="Status">{humanizeStatus(strike.related_call.status)}</DetailRow>
                <DetailRow label="Connected">
                  {formatDuration(strike.related_call.connected_seconds)}
                </DetailRow>
                <DetailRow label="Scheduled">
                  {formatDateTime(strike.related_call.scheduled_at)}
                </DetailRow>
              </DetailSection>
            )}

            {strike.related_booking && (
              <DetailSection title="Related booking">
                <DetailRow label="ID">{shortId(strike.related_booking.id, 18)}</DetailRow>
                <DetailRow label="Status">{humanizeStatus(strike.related_booking.status)}</DetailRow>
                <DetailRow label="Created">{formatDateTime(strike.related_booking.created_at)}</DetailRow>
              </DetailSection>
            )}

            {strike.subject_strike_history && (
              <DetailSection title="Subject strike history">
                <DetailRow label="Active">
                  <AppText variant="bodyTitle" className="text-text-primary">
                    {strike.subject_strike_history.active_count} of{' '}
                    {strike.subject_strike_history.strikes_before_ban} before ban
                  </AppText>
                </DetailRow>
                <DetailRow label="Total">{strike.subject_strike_history.total_count}</DetailRow>
                <DetailRow label="Upheld">{strike.subject_strike_history.upheld_count}</DetailRow>
                <DetailRow label="Voided">{strike.subject_strike_history.voided_count}</DetailRow>
              </DetailSection>
            )}

            {strike.audit_trail && strike.audit_trail.length > 0 && (
              <DetailSection title={`Audit trail (${strike.audit_trail.length})`}>
                <ul className="flex flex-col gap-1.5">
                  {strike.audit_trail.map((t) => (
                    <li key={t.id} className="rounded-md border border-border px-3 py-2 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <code className="font-semibold text-text-primary">{t.action}</code>
                        <span className="text-text-muted">{formatDateTime(t.created_at)}</span>
                      </div>
                      <div className="mt-0.5 text-text-muted">
                        {t.admin_email ?? shortId(t.admin_id, 12)}
                      </div>
                      {t.note && (
                        <div className="mt-1 whitespace-pre-wrap text-text-primary">{t.note}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}
          </>
        )}
      </QueryView>
    </DetailDrawer>
  );
}
