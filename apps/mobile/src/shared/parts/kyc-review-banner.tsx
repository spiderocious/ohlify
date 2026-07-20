import { AppText, colors } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { onboardingApi } from '@features/onboarding/api/onboarding-api';

/**
 * Sticky banner shown across the tabbed shell while the user's KYC
 * submission is awaiting admin review. Renders nothing in any other state.
 * Mirrors mobile/lib/ui/widgets/kyc_review_banner/kyc_review_banner.dart.
 */
export function KycReviewBanner() {
  const [pendingReview, setPendingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onboardingApi
      .getStatus()
      .then((status) => {
        if (!cancelled) setPendingReview(status.kycStatus === 'pendingReview');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pendingReview) return null;

  return (
    <View style={{ backgroundColor: '#FFF8E1', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFE082', alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="bodySmall" color="#8D6E00" align="center">
          ⏱
        </AppText>
      </View>
      <View style={{ width: 10 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodySmall" color="#6B4E00" weight="700" align="left">
          Your KYC is under review
        </AppText>
        <View style={{ height: 2 }} />
        <AppText variant="bodySmall" color={colors.textMuted} align="left">
          We'll let you know as soon as the admin team finishes verifying your submission.
        </AppText>
      </View>
    </View>
  );
}
