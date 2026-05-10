import { AppButton, AppText } from '@ohlify/ui';

import { DetailDrawer } from '../../../shared/parts/detail-drawer.js';
import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { StatusPill } from '../../../shared/parts/status-pill.js';
import { promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime, formatDuration } from '../../../shared/format/datetime.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useHideReview, useReviewDetail, useUnhideReview } from '../api/use-reviews.js';
import { StarRating } from './star-rating.js';

interface ReviewDetailDrawerProps {
  reviewId: string | null;
  onClose: () => void;
}

export function ReviewDetailDrawer({ reviewId, onClose }: ReviewDetailDrawerProps) {
  const detail = useReviewDetail(reviewId);
  const hide = useHideReview(reviewId ?? '');
  const unhide = useUnhideReview(reviewId ?? '');
  const review = detail.data;

  const onHide = async () => {
    if (!review) return;
    const reason = await promptForReason({
      title: 'Hide review',
      message: 'Hidden reviews stop counting toward the pro\'s public rating. Provide a reason.',
      placeholder: 'e.g. Personal attack on the professional',
    });
    if (!reason) return;
    hide.mutate(
      { reason },
      {
        onSuccess: () => toastSuccess('Review hidden'),
        onError: (err) => toastError(err),
      },
    );
  };

  const onUnhide = async () => {
    if (!review) return;
    const reason = await promptForReason({
      title: 'Restore review',
      message: 'Review will be visible again and recounted toward the pro\'s rating.',
      placeholder: 'e.g. Re-reviewed, original hide was a mistake',
    });
    if (!reason) return;
    unhide.mutate(
      { reason },
      {
        onSuccess: () => toastSuccess('Review restored'),
        onError: (err) => toastError(err),
      },
    );
  };

  const isHidden = Boolean(review?.hidden_at);

  return (
    <DetailDrawer
      open={Boolean(reviewId)}
      onClose={onClose}
      title={review ? `Review by ${review.reviewer?.name ?? shortId(review.reviewer?.id, 12)}` : 'Review'}
      subtitle={review ? `About ${review.subject?.name ?? shortId(review.subject?.id, 12)}` : undefined}
      width={560}
      footer={
        review ? (
          isHidden ? (
            <AppButton label="Restore" variant="solid" height={36} onPressed={onUnhide} />
          ) : (
            <AppButton label="Hide" variant="outline" height={36} onPressed={onHide} />
          )
        ) : null
      }
    >
      <QueryView isLoading={detail.isLoading} error={detail.error}>
        {review && (
          <>
            <DetailSection title="Review">
              <DetailRow label="ID">{shortId(review.id, 18)}</DetailRow>
              <DetailRow label="Status">
                {isHidden ? (
                  <StatusPill label="Hidden" tone="danger" />
                ) : (
                  <StatusPill label="Visible" tone="success" />
                )}
              </DetailRow>
              <DetailRow label="Rating">
                <StarRating value={review.rating} size={18} />
              </DetailRow>
              <DetailRow label="Public">{review.is_public ? 'Yes' : 'No'}</DetailRow>
              <DetailRow label="Feedback">
                <span className="whitespace-pre-wrap text-text-primary">
                  {review.feedback_text ?? '—'}
                </span>
              </DetailRow>
              <DetailRow label="Created">{formatDateTime(review.created_at)}</DetailRow>
            </DetailSection>

            <DetailSection title="Parties">
              <DetailRow label="Reviewer">
                <div className="flex flex-col">
                  <span className="text-text-primary">{review.reviewer?.name ?? '—'}</span>
                  <UserLink userId={review.reviewer?.id} idLen={18} />
                </div>
              </DetailRow>
              <DetailRow label="Subject">
                <div className="flex flex-col">
                  <span className="text-text-primary">{review.subject?.name ?? '—'}</span>
                  <UserLink userId={review.subject?.id} idLen={18} />
                </div>
              </DetailRow>
            </DetailSection>

            {review.call && (
              <DetailSection title="Call">
                <DetailRow label="Call ID">{shortId(review.call.id, 18)}</DetailRow>
                <DetailRow label="Type">{humanizeStatus(review.call.call_type)}</DetailRow>
                <DetailRow label="Booked">{review.call.duration_minutes} min</DetailRow>
                <DetailRow label="Connected">{formatDuration(review.call.connected_seconds)}</DetailRow>
                <DetailRow label="Scheduled">{formatDateTime(review.call.scheduled_at)}</DetailRow>
                <DetailRow label="Status">{humanizeStatus(review.call.status)}</DetailRow>
              </DetailSection>
            )}

            {isHidden && (
              <DetailSection title="Hidden">
                <DetailRow label="Hidden at">{formatDateTime(review.hidden_at)}</DetailRow>
                <DetailRow label="Hidden by">
                  {review.hidden_by_admin_id ? (
                    <UserLink userId={review.hidden_by_admin_id} idLen={18} />
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="Reason">
                  <span className="whitespace-pre-wrap">{review.hide_reason ?? '—'}</span>
                </DetailRow>
              </DetailSection>
            )}

            {review.audit_trail && review.audit_trail.length > 0 && (
              <DetailSection title={`Audit trail (${review.audit_trail.length})`}>
                <ul className="flex flex-col gap-1.5">
                  {review.audit_trail.map((t) => (
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
