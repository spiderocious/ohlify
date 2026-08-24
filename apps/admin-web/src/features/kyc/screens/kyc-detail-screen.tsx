import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import type { AdminKycSubmission } from '@ohlify/api';
import {
  HawkAdminPageHeader,
  HawkAdminPanel,
  HawkBadge,
  HawkBreadcrumb,
  HawkButton,
  HawkCallout,
  HawkCaption,
  HawkEmptyState,
  HawkKeyValue,
  HawkSemantic,
  HawkStatusBadge,
  HawkText,
} from '@ohlify/hawk-ui';

import { FilePreview } from '../../../shared/parts/file-preview.js';
import { statusFor } from '../../../shared/parts/board-status.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { confirm, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime } from '../../../shared/format/datetime.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { ADMIN_ROUTES } from '../../../shared/routes/admin-routes.js';
import { useApproveKyc, useRejectKyc, type RejectKycPayload } from '../api/use-kyc.js';
import { RejectKycDrawer } from './parts/reject-kyc-drawer.js';

/**
 * One KYC submission — gating someone's ability to earn (A21).
 *
 * The documents lead and take most of the width, because that is the actual
 * work: an operator decides by *looking* at the identity document beside the
 * selfie, not by reading a status field. Everything else on the screen is
 * context for that comparison.
 *
 * Rejection names the fix rather than just refusing — the drawer collects the
 * specific items to resubmit, so the user is told what to change instead of
 * being sent back to guess.
 */
export function KycDetailScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // The backend has no GET-one endpoint yet, so the queue passes the row via
  // router state. A direct deep-link lands without it and gets a pointer back
  // rather than a broken screen.
  const submission = (location.state as { submission?: AdminKycSubmission } | null)?.submission;

  const approve = useApproveKyc(id);
  const reject = useRejectKyc(id);
  const [rejectOpen, setRejectOpen] = useState(false);

  const onApprove = async () => {
    if (
      !(await confirm({
        title: 'Approve KYC?',
        message:
          'The user is verified immediately, their role flips to professional, and their profile goes live in search.',
      }))
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

  const breadcrumb = (
    <HawkBreadcrumb
      items={[
        { label: 'KYC review', href: ADMIN_ROUTES.KYC.absPath },
        { label: submission ? shortId(submission.id, 12) : shortId(id, 12) },
      ]}
      as={Link}
    />
  );

  if (!submission) {
    return (
      <>
        <HawkAdminPageHeader breadcrumb={breadcrumb} title="Submission" />
        <div className="px-hawk-pad py-hawk-9">
          <HawkEmptyState
            title="Open this from the queue"
            description="Deep links to a single submission need backend support. Click the row in the KYC queue to inspect it."
            action={
              <HawkButton
                label="Go to queue"
                onClick={() => navigate(ADMIN_ROUTES.KYC.absPath)}
              />
            }
          />
        </div>
      </>
    );
  }

  const isPending = submission.status === 'pending_review';
  const missingDocuments = !submission.document_upload_id || !submission.selfie_upload_key;

  return (
    <>
      <HawkAdminPageHeader
        breadcrumb={breadcrumb}
        title={
          <span className="flex flex-wrap items-center gap-hawk-4">
            <HawkText variant="header" ink="strong" as="h1">
              {humanizeStatus(submission.identity_type ?? 'Submission')}
            </HawkText>
            <HawkStatusBadge status={statusFor('kyc', submission.status)} size="sm" />
          </span>
        }
        subtitle={`Submitted ${formatDateTime(submission.created_at)}`}
        actions={
          isPending ? (
            <div className="flex items-center gap-hawk-3">
              <HawkButton
                label="Reject"
                variant="outline"
                destructive
                onClick={() => setRejectOpen(true)}
              />
              <HawkButton
                label="Approve"
                loading={approve.isPending}
                disabled={missingDocuments}
                onClick={() => void onApprove()}
              />
            </div>
          ) : null
        }
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        {/*
          An approval on a submission with nothing to look at is an approval
          made on faith. The button is disabled and the reason is stated.
        */}
        {missingDocuments && isPending && (
          <HawkCallout
            semantic={HawkSemantic.CRITICAL}
            title="Cannot approve — documents missing"
            message="This submission is missing the identity document or the selfie. Reject it and ask the user to resubmit."
          />
        )}

        <div className="grid gap-hawk-6 xl:grid-cols-3">
          <div className="flex flex-col gap-hawk-6 xl:col-span-2">
            {/*
              Side by side, and big. The comparison IS the review — two
              previews stacked in a narrow column would make an operator
              scroll between the two faces they are meant to compare.
            */}
            <div className="grid gap-hawk-6 md:grid-cols-2">
              <HawkAdminPanel title="Identity document">
                <FilePreview
                  fileKey={submission.document_upload_id}
                  label="Identity document"
                  height={340}
                />
              </HawkAdminPanel>

              <HawkAdminPanel title="Selfie">
                <FilePreview
                  fileKey={submission.selfie_upload_key}
                  label="Selfie"
                  height={340}
                />
              </HawkAdminPanel>
            </div>

            <HawkAdminPanel title="Identity fields">
              <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
                <HawkKeyValue
                  label="Type"
                  value={humanizeStatus(submission.identity_type ?? '')}
                />
                <HawkKeyValue label="Number" value={submission.identity_number ?? '—'} record />
                <HawkKeyValue
                  label="Document key"
                  value={submission.document_upload_id ?? '—'}
                  record
                />
                <HawkKeyValue
                  label="Selfie key"
                  value={submission.selfie_upload_key ?? '—'}
                  record
                />
              </div>
            </HawkAdminPanel>
          </div>

          <div className="flex flex-col gap-hawk-6">
            <HawkAdminPanel title="Submission">
              <div className="flex flex-col gap-hawk-4">
                <HawkKeyValue label="ID" value={shortId(submission.id, 20)} record />
                <HawkKeyValue
                  label="Subject"
                  value={<UserLink userId={submission.user_id} idLen={20} />}
                />
                <HawkKeyValue
                  label="Status"
                  value={
                    <HawkStatusBadge status={statusFor('kyc', submission.status)} size="sm" />
                  }
                />
                <HawkKeyValue
                  label="Submitted"
                  value={formatDateTime(submission.created_at)}
                  record
                />
              </div>
            </HawkAdminPanel>

            <HawkAdminPanel title="Review">
              <div className="flex flex-col gap-hawk-4">
                <HawkKeyValue
                  label="Reviewed by"
                  value={
                    submission.reviewed_by ? (
                      <UserLink userId={submission.reviewed_by} />
                    ) : (
                      '—'
                    )
                  }
                />
                <HawkKeyValue
                  label="Reviewed at"
                  value={formatDateTime(submission.reviewed_at)}
                  record
                />
                <HawkKeyValue
                  label="Reason"
                  value={
                    submission.reject_reason_code
                      ? humanizeStatus(submission.reject_reason_code)
                      : '—'
                  }
                />

                {submission.reject_item_keys.length > 0 ? (
                  <div className="flex flex-col gap-hawk-2">
                    <HawkCaption ink="muted">Items to resubmit</HawkCaption>
                    <div className="flex flex-wrap gap-hawk-2">
                      {submission.reject_item_keys.map((key) => (
                        <HawkBadge
                          key={key}
                          label={humanizeStatus(key)}
                          semantic={HawkSemantic.CAUTION}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                ) : submission.status === 'rejected' ? (
                  <HawkCaption ink="muted">All items — full resubmit required.</HawkCaption>
                ) : null}

                {submission.reject_note && (
                  <div className="flex flex-col gap-hawk-2">
                    <HawkCaption ink="muted">Note to the user</HawkCaption>
                    <HawkText variant="caption" className="whitespace-pre-wrap leading-relaxed">
                      {submission.reject_note}
                    </HawkText>
                  </div>
                )}
              </div>
            </HawkAdminPanel>
          </div>
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
