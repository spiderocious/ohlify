import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { AppButton, AppText } from '@ohlify/ui';
import type { AdminKycSubmission } from '@ohlify/api';

import { BackLink } from '../../../shared/parts/back-link.js';
import { DetailRow } from '../../../shared/parts/detail-row.js';
import { FilePreview } from '../../../shared/parts/file-preview.js';
import { InfoCard } from '../../../shared/parts/info-card.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { toastError, toastSuccess, confirm } from '../../../shared/lib/confirm.js';
import { formatDateTime } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { ADMIN_ROUTES } from '../../../shared/routes/admin-routes.js';
import { KycStatusPill } from '../../users/parts/user-status-pill.js';
import { useApproveKyc, useRejectKyc, type RejectKycPayload } from '../api/use-kyc.js';

import { RejectKycDrawer } from './parts/reject-kyc-drawer.js';

export function KycDetailScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Backend doesn't expose a GET-one endpoint yet, so the list view passes
  // the row via React Router state. Direct deep-links land without state
  // and we render a graceful pointer back to the queue.
  const submission = (location.state as { submission?: AdminKycSubmission } | null)?.submission;

  const approve = useApproveKyc(id);
  const reject = useRejectKyc(id);
  const [rejectOpen, setRejectOpen] = useState(false);

  const onApprove = async () => {
    if (
      !(await confirm({ title: 'Approve KYC?', message: 'User will be approved immediately.' }))
    )
      return;
    approve.mutate(
      {},
      {
        onSuccess: () => {
          toastSuccess('KYC approved');
          navigate(ADMIN_ROUTES.KYC.absPath);
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const onRejectSubmit = (payload: RejectKycPayload) => {
    reject.mutate(payload, {
      onSuccess: () => {
        const partial = (payload.item_keys?.length ?? 0) > 0;
        toastSuccess(
          partial
            ? `KYC rejected — user must resubmit ${payload.item_keys!.length} item(s)`
            : 'KYC rejected',
        );
        setRejectOpen(false);
        navigate(ADMIN_ROUTES.KYC.absPath);
      },
      onError: (err) => toastError(err),
    });
  };

  if (!submission) {
    return (
      <>
        <PageHeader
          topSlot={<BackLink to={ADMIN_ROUTES.KYC.absPath} label="KYC queue" />}
          title={`Submission ${shortId(id, 12)}`}
        />
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center sm:px-6">
          <AppText variant="bodyTitle">Open from the queue</AppText>
          <AppText variant="bodySmall" className="text-text-muted">
            Direct deep-links to KYC submissions need backend support. Click the row from the KYC
            queue to inspect.
          </AppText>
          <AppButton
            label="Go to queue"
            variant="solid"
            height={36}
            onPressed={() => navigate(ADMIN_ROUTES.KYC.absPath)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        topSlot={<BackLink to={ADMIN_ROUTES.KYC.absPath} label="KYC queue" />}
        title={`Submission ${shortId(submission.id, 12)}`}
        subtitle={`Submitted ${formatDateTime(submission.created_at)}`}
        actions={
          <>
            <AppButton
              label="Reject"
              variant="outline"
              height={36}
              onPressed={() => setRejectOpen(true)}
            />
            <AppButton label="Approve" variant="solid" height={36} onPressed={onApprove} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 px-4 py-6 sm:px-6 xl:grid-cols-3">
        {/* Left: identity document + selfie + meta */}
        <div className="flex flex-col gap-4 xl:col-span-2">
          <InfoCard title="Identity document">
            <FilePreview
              fileKey={submission.document_upload_id}
              label={`${humanizeStatus(submission.identity_type ?? '')} for ${shortId(submission.user_id, 12)}`}
              height={420}
            />
          </InfoCard>

          <InfoCard title="Selfie">
            <FilePreview
              fileKey={submission.selfie_upload_key}
              label={`Selfie of ${shortId(submission.user_id, 12)}`}
              height={420}
            />
          </InfoCard>

          <InfoCard title="Identity fields">
            <DetailRow label="Type">{humanizeStatus(submission.identity_type ?? '')}</DetailRow>
            <DetailRow label="Number">
              <code>{submission.identity_number ?? '—'}</code>
            </DetailRow>
            <DetailRow label="Document key">
              <code className="text-xs break-all">{submission.document_upload_id ?? '—'}</code>
            </DetailRow>
            <DetailRow label="Selfie key">
              <code className="text-xs break-all">{submission.selfie_upload_key ?? '—'}</code>
            </DetailRow>
          </InfoCard>
        </div>

        {/* Right: state + review */}
        <div className="flex flex-col gap-4">
          <InfoCard title="Submission">
            <DetailRow label="Submission ID">{shortId(submission.id, 18)}</DetailRow>
            <DetailRow label="Subject">
              <UserLink userId={submission.user_id} idLen={18} />
            </DetailRow>
            <DetailRow label="Status">
              <KycStatusPill status={submission.status} />
            </DetailRow>
            <DetailRow label="Created">{formatDateTime(submission.created_at)}</DetailRow>
          </InfoCard>

          <InfoCard title="Review">
            <DetailRow label="Reviewed by">
              {submission.reviewed_by ? <UserLink userId={submission.reviewed_by} /> : '—'}
            </DetailRow>
            <DetailRow label="Reviewed at">{formatDateTime(submission.reviewed_at)}</DetailRow>
            <DetailRow label="Reject reason">{submission.reject_reason_code ?? '—'}</DetailRow>
            <DetailRow label="Items to resubmit">
              {submission.reject_item_keys.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {submission.reject_item_keys.map((k) => (
                    <span
                      key={k}
                      className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                    >
                      {k}
                    </span>
                  ))}
                </span>
              ) : submission.status === 'rejected' ? (
                <span className="text-text-muted">All items (full resubmit)</span>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow label="Reject note">
              <span className="whitespace-pre-wrap">{submission.reject_note ?? '—'}</span>
            </DetailRow>
          </InfoCard>
        </div>
      </div>

      <RejectKycDrawer
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        isSubmitting={reject.isPending}
        onSubmit={onRejectSubmit}
      />
    </>
  );
}
