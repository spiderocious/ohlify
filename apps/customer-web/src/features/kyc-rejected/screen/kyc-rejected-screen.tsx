import { useNavigate } from 'react-router-dom';

import { AppButton, AppText } from '@ohlify/ui';
import { ROUTES } from '@ohlify/core';
import type { KycRejection } from '@ohlify/api';
import { IconAlertTriangle, IconCheckCircle } from '@icons';

import { useOnboardingStatus } from '../api/use-onboarding-status.js';

/**
 * Two faces:
 *
 *   - 'rejected'        → shows the admin's rejection note + "Resubmit" CTA
 *                         that drops the user back into the existing pro KYC
 *                         flow (their prior data is still there to edit).
 *
 *   - 'pending_review'  → user already resubmitted; renders an "Awaiting
 *                         re-review" interstitial. users.kyc_status stays
 *                         'rejected' (per backend policy) until admin acts,
 *                         so we read latest_submission_status to switch UI.
 *
 * The OnboardingGuard routes here whenever step === 'kyc_rejected'.
 */
export function KycRejectedScreen() {
  const navigate = useNavigate();
  const { data, isLoading } = useOnboardingStatus();

  if (isLoading) return null;

  const rejection = data?.kyc_rejection ?? null;
  const awaitingReview = rejection?.latest_submission_status === 'pending_review';

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-5 pb-32 pt-10 lg:max-w-2xl">
          <div
            className={
              'flex h-12 w-12 items-center justify-center rounded-md ' +
              (awaitingReview ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
            }
          >
            {awaitingReview ? (
              <IconCheckCircle size={22} />
            ) : (
              <IconAlertTriangle size={22} />
            )}
          </div>

          <AppText as="h1" variant="bodyTitle" weight={700} className="mt-5">
            {awaitingReview ? 'Resubmission received' : 'Your KYC was not approved'}
          </AppText>

          <AppText variant="body" className="mt-2 text-text-muted">
            {awaitingReview
              ? "Thanks — we've got your updated submission. An admin will re-review and you'll be notified when it's decided."
              : "An admin reviewed your verification and asked for changes. Please update your details and resubmit so we can take another look."}
          </AppText>

          {!awaitingReview && rejection && (
            <RejectionDetails rejection={rejection} />
          )}

          {awaitingReview && rejection?.note && (
            <div className="mt-6 rounded-lg border border-border bg-surface p-4">
              <AppText
                variant="bodySmall"
                className="text-[11px] font-bold uppercase tracking-wider text-text-muted"
              >
                Admin's previous note
              </AppText>
              <AppText variant="body" className="mt-1 whitespace-pre-wrap text-text-primary">
                {rejection.note}
              </AppText>
            </div>
          )}
        </div>
      </div>

      {!awaitingReview && (
        <div className="sticky bottom-0 border-t border-border bg-background px-5 py-4">
          <div className="mx-auto w-full max-w-xl lg:max-w-2xl">
            <AppButton
              label="Update & resubmit"
              variant="solid"
              expanded
              onPressed={() => navigate(ROUTES.PROFESSIONAL_KYC.absPath)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function RejectionDetails({ rejection }: { rejection: KycRejection }) {
  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <AppText
          variant="bodySmall"
          className="text-[11px] font-bold uppercase tracking-wider text-amber-700"
        >
          Reason
        </AppText>
        <AppText variant="bodyTitle" className="mt-1 text-text-primary">
          {humanizeReason(rejection.reason_code)}
        </AppText>
      </div>

      {rejection.note && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <AppText
            variant="bodySmall"
            className="text-[11px] font-bold uppercase tracking-wider text-text-muted"
          >
            What the admin said
          </AppText>
          <AppText variant="body" className="mt-1 whitespace-pre-wrap text-text-primary">
            {rejection.note}
          </AppText>
        </div>
      )}
    </section>
  );
}

const REASON_LABELS: Record<string, string> = {
  document_unclear: 'The ID document was unclear',
  identity_mismatch: 'Identity details did not match',
  expired_document: 'The ID document was expired',
  fraudulent: 'Verification failed integrity checks',
  other: 'Additional information needed',
};

function humanizeReason(code: string | null | undefined): string {
  if (!code) return 'Verification not approved';
  return REASON_LABELS[code] ?? code.replace(/_/g, ' ');
}
