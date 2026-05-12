import { AppText } from '@ohlify/ui';
import { IconClock } from '@icons';

import { useOnboardingStatus } from '../../features/kyc-rejected/api/use-onboarding-status.js';

/**
 * Sticky banner shown across the tabbed shell (Home / Calls / Wallet /
 * Profile) while the user's KYC submission is awaiting admin review.
 * Renders nothing in any other state — including while the status query
 * is still loading, so we don't flash a banner that disappears.
 *
 * The banner reads `users.kyc_status` directly from `/onboarding/status`
 * (NOT the `step` field — `step` collapses pending+approved into
 * `'complete'` once items are filled).
 */
export function KycReviewBanner() {
  const { data } = useOnboardingStatus();
  if (data?.kyc_status !== 'pending_review') return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-2.5 lg:px-5"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
        <IconClock size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <AppText
          variant="bodySmall"
          weight={700}
          align="start"
          className="text-amber-900"
        >
          Your KYC is under review
        </AppText>
        <AppText
          variant="bodySmall"
          align="start"
          className="text-amber-800/80"
        >
          We&apos;ll let you know as soon as the admin team finishes verifying your submission.
        </AppText>
      </div>
    </div>
  );
}
