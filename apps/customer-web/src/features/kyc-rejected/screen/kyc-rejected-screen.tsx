import { useNavigate } from 'react-router-dom';

import { AppButton, AppText, DrawerService } from '@ohlify/ui';
import { ROUTES } from '@ohlify/core';
import type { KycRejection } from '@ohlify/api';
import { IconAlertTriangle, IconCheckCircle } from '@icons';

import { useLogout } from '../../profile/api/use-logout.js';
import { useOnboardingStatus } from '../api/use-onboarding-status.js';

/**
 * Three faces, driven by `data.kyc_status`:
 *
 *   - 'rejected'        → admin asked for changes. Shows the rejection note +
 *                         flagged items + "Update N items" CTA into pro KYC.
 *
 *   - 'pending_review'  → user already resubmitted (or just submitted for the
 *                         first time). Shows an "Under review" interstitial
 *                         with a "Go to Dashboard" CTA. The home shell also
 *                         carries a sticky review banner so the user can
 *                         freely use the app while admins re-review.
 *
 *   - 'approved'        → defensive. The user shouldn't normally land here
 *                         after approval (OnboardingGuard sends them to
 *                         home), but if they navigate via a saved URL or
 *                         back button we still show a sensible "Go to
 *                         Dashboard" path rather than a stale rejection.
 *
 * The OnboardingGuard routes here whenever `step === 'kyc_rejected'`, which
 * only fires while `users.kyc_status === 'rejected'`. The other faces are
 * reachable by direct navigation (back button, deep link) or by an admin
 * decision taken with this tab still open.
 */
export function KycRejectedScreen() {
  const navigate = useNavigate();
  const { data, isLoading } = useOnboardingStatus();
  const logout = useLogout();

  if (isLoading) return null;

  const kycStatus = data?.kyc_status;
  // `pending_review` and `approved` both render the under-review face —
  // approved is rare here (user got bounced by the guard before that
  // could happen) but the same "you're done with this screen, go home"
  // copy works for both.
  const isUnderReview = kycStatus === 'pending_review' || kycStatus === 'approved';
  const rejection = data?.kyc_rejection ?? null;

  const confirmLogout = () => {
    let confirmed = false;
    const handle = DrawerService.showConfirmationModal(
      'Log out?',
      'You will need to sign in again to continue verification.',
      {
        kind: 'warning',
        confirmButtonText: 'Log out',
        cancelButtonText: 'Stay signed in',
        onConfirm: () => {
          confirmed = true;
        },
      },
    );
    void handle.onDismissed.then(() => {
      if (!confirmed) return;
      logout.mutate(undefined, {
        onSuccess: () => navigate(ROUTES.LOGIN.absPath, { replace: true }),
      });
    });
  };

  const primaryAction = isUnderReview
    ? {
        label: 'Go to Dashboard',
        onPress: () => navigate(ROUTES.HOME.absPath, { replace: true }),
      }
    : {
        label:
          rejection && rejection.item_keys.length > 0
            ? `Update ${rejection.item_keys.length} item${rejection.item_keys.length === 1 ? '' : 's'}`
            : 'Update & resubmit',
        onPress: () => navigate(ROUTES.PROFESSIONAL_KYC.absPath),
      };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-5 pb-32 pt-10 lg:max-w-2xl">
          <div
            className={
              'flex h-16 w-16 items-center justify-center rounded-full ' +
              (isUnderReview
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700')
            }
          >
            {isUnderReview ? (
              <IconCheckCircle size={28} />
            ) : (
              <IconAlertTriangle size={28} />
            )}
          </div>

          <AppText
            as="h1"
            variant="title"
            weight={800}
            align="start"
            className="mt-5"
            color="var(--ohl-text-jet)"
          >
            {isUnderReview ? 'Your KYC is under review' : 'Your KYC was not approved'}
          </AppText>

          <AppText
            variant="body"
            align="start"
            color="var(--ohl-text-muted)"
            className="mt-2 leading-relaxed"
          >
            {isUnderReview
              ? "Thanks — we've got your submission. An admin will review and you'll be notified when it's decided. You can keep using your dashboard while you wait."
              : 'An admin reviewed your verification and asked for changes. Please update your details and resubmit so we can take another look.'}
          </AppText>

          {!isUnderReview && rejection && <ReasonBlock rejection={rejection} />}

          {!isUnderReview && rejection && rejection.item_keys.length > 0 && (
            <ItemsToUpdate itemKeys={rejection.item_keys} />
          )}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background px-5 py-4">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2.5 lg:max-w-2xl">
          <AppButton
            label={primaryAction.label}
            variant="solid"
            expanded
            radius={100}
            onPressed={primaryAction.onPress}
          />
          <AppButton
            label="Log out"
            variant="plain"
            expanded
            radius={100}
            isLoading={logout.isPending}
            onPressed={confirmLogout}
          />
        </div>
      </div>
    </main>
  );
}

const ITEM_LABELS: Record<string, { label: string; hint: string }> = {
  identity: { label: 'ID document', hint: 'Re-take a clear photo of your government ID' },
  selfie: { label: 'Selfie', hint: 'Take a fresh selfie' },
  bank_account: { label: 'Bank account', hint: 'Confirm or replace your payout details' },
  full_name: { label: 'Full name', hint: 'Match the name on your ID exactly' },
  handle: { label: 'Public handle', hint: 'Pick a new booking-link slug' },
  occupation: { label: 'Occupation', hint: 'Update your professional title' },
  description: { label: 'Description', hint: 'Refresh your bio' },
  interests: { label: 'Interests', hint: 'Update your tag list' },
  rates: { label: 'Rates', hint: 'Review your call pricing' },
};

function ItemsToUpdate({ itemKeys }: { itemKeys: readonly string[] }) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-3">
        <AppText
          variant="bodySmall"
          align="start"
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted"
        >
          Items to update
        </AppText>
      </div>
      <ul className="divide-y divide-border">
        {itemKeys.map((key) => {
          const meta = ITEM_LABELS[key] ?? { label: key, hint: 'Update this item' };
          return (
            <li key={key} className="flex items-start gap-3 px-5 py-3.5">
              <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-800">
                !
              </span>
              <div className="min-w-0 flex-1 flex flex-col">
                <AppText
                  variant="body"
                  weight={600}
                  align="start"
                  color="var(--ohl-text-jet)"
                >
                  {meta.label}
                </AppText>
                <AppText
                  variant="bodySmall"
                  align="start"
                  className="mt-0.5 text-text-muted"
                >
                  {meta.hint}
                </AppText>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ReasonBlock({ rejection }: { rejection: KycRejection }) {
  const note = rejection.note?.trim() || humanizeReason(rejection.reason_code);
  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="h-1 w-full bg-amber-400" />
      <div className="flex flex-col gap-2 p-5">
        <AppText
          variant="bodySmall"
          align="start"
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted"
        >
          Reason
        </AppText>
        <AppText
          variant="body"
          align="start"
          color="var(--ohl-text-jet)"
          className="whitespace-pre-wrap leading-relaxed"
        >
          {note}
        </AppText>
      </div>
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
