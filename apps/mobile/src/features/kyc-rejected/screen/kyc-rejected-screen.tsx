import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { onboardingApi } from '@features/onboarding/api/onboarding-api';
import type { KycRejection } from '@features/onboarding/types/onboarding-status';
import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';

/**
 * KYC rejection screen — three visual variants switched on
 * OnboardingStatus.kycStatus:
 *  - rejected: reason + admin note + "Update N items" CTA back into pro KYC.
 *  - pending_review: "Under review" interstitial + "Go to Dashboard" CTA.
 *  - approved: defensive fallback, same Dashboard CTA (splash normally
 *    routes an approved user home before they can land here).
 * Mirrors mobile/lib/features/kyc_rejected/screen/kyc_rejected_screen.dart.
 */
type KycRejectedNavigationProp = NativeStackNavigationProp<RootStackParamList, 'KycRejected'>;

const ITEM_META: Record<string, { label: string; hint: string }> = {
  identity: { label: 'ID document', hint: 'Re-take a clear photo of your government ID' },
  selfie: { label: 'Selfie', hint: 'Hold your ID and take a fresh selfie' },
  bank_account: { label: 'Bank account', hint: 'Confirm or replace your payout details' },
  full_name: { label: 'Full name', hint: 'Match the name on your ID exactly' },
  handle: { label: 'Public handle', hint: 'Pick a new booking-link slug' },
  occupation: { label: 'Occupation', hint: 'Update your professional title' },
  description: { label: 'Description', hint: 'Refresh your bio' },
  interests: { label: 'Interests', hint: 'Update your tag list' },
  rates: { label: 'Rates', hint: 'Review your call pricing' },
};

export function KycRejectedScreen() {
  const navigation = useNavigation<KycRejectedNavigationProp>();
  const { logout } = useAuthSession();

  const { data: status, isLoading, error, refetch } = useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: () => onboardingApi.getStatus(),
  });

  async function onLogout() {
    await logout();
    // This screen sits directly on RootStack, not nested in another
    // navigator, so `navigation` here already IS the root navigator — no
    // getParent() hop needed.
    navigation.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Login' } }] });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <ErrorState message={error instanceof ApiError ? apiErrorMessage(error) : String(error)} onRetry={() => void refetch()} />
        ) : status ? (
          <Body
            rejection={status.kycRejection}
            isUnderReview={status.kycStatus === 'pendingReview' || status.kycStatus === 'approved'}
            onPrimary={() =>
              status.kycStatus === 'pendingReview' || status.kycStatus === 'approved'
                ? navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
                : navigation.reset({ index: 0, routes: [{ name: 'ProfessionalKyc' }] })
            }
            onLogout={onLogout}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function primaryLabel(isUnderReview: boolean, rejection?: KycRejection): string {
  if (isUnderReview) return 'Go to Dashboard';
  const count = rejection?.itemKeys.length ?? 0;
  if (count > 0) return `Update ${count} item${count === 1 ? '' : 's'}`;
  return 'Update & resubmit';
}

function Body({
  rejection,
  isUnderReview,
  onPrimary,
  onLogout,
}: {
  rejection?: KycRejection;
  isUnderReview: boolean;
  onPrimary: () => void;
  onLogout: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 20, paddingBottom: 24 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: `${isUnderReview ? colors.success : colors.warning}1F`,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
          }}
        >
          <AppIcon name={isUnderReview ? 'checkCircle' : 'error'} size={32} color={isUnderReview ? colors.success : colors.warning} />
        </View>
        <View style={{ height: 18 }} />
        <AppText variant="title" color={colors.textJet} weight="800" align="left">
          {isUnderReview ? 'Your KYC is under review' : 'Your KYC was not approved'}
        </AppText>
        <View style={{ height: 8 }} />
        <AppText variant="body" color={colors.textMuted} align="left">
          {isUnderReview
            ? "Thanks — we've got your submission. An admin will review and you'll be notified when it's decided. You can keep using your dashboard while you wait."
            : 'An admin reviewed your verification and asked for changes. Please update your details and resubmit so we can take another look.'}
        </AppText>

        {!isUnderReview && rejection ? (
          <>
            <View style={{ height: 28 }} />
            <Card label="Reason" body={rejection.note?.trim() ? rejection.note.trim() : rejectionReasonLabel(rejection.reasonCode)} accent={colors.warning} />
            {rejection.itemKeys.length > 0 ? (
              <>
                <View style={{ height: 16 }} />
                <ItemsToUpdate itemKeys={rejection.itemKeys} />
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <AppButton label={primaryLabel(isUnderReview, rejection)} expanded radius={100} onPress={onPrimary} />
        <View style={{ height: 10 }} />
        <AppButton label="Log out" variant="plain" expanded radius={100} onPress={onLogout} />
      </View>
    </View>
  );
}

const REASON_LABELS: Record<string, string> = {
  document_unclear: 'The ID document was unclear',
  identity_mismatch: 'Identity details did not match',
  expired_document: 'The ID document was expired',
  fraudulent: 'Verification failed integrity checks',
  other: 'Additional information needed',
};

function rejectionReasonLabel(reasonCode: string): string {
  return REASON_LABELS[reasonCode] ?? reasonCode.replace(/_/g, ' ');
}

function Card({ label, body, accent }: { label: string; body: string; accent: string }) {
  return (
    <View style={{ borderRadius: 20, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      <View style={{ height: 4, backgroundColor: accent }} />
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: colors.textMuted }}>{label.toUpperCase()}</Text>
        <View style={{ height: 10 }} />
        <AppText variant="body" color={colors.textJet} align="left" weight="500">
          {body}
        </AppText>
      </View>
    </View>
  );
}

function ItemsToUpdate({ itemKeys }: { itemKeys: string[] }) {
  return (
    <View style={{ borderRadius: 20, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: colors.textMuted }}>ITEMS TO UPDATE</Text>
      </View>
      {itemKeys.map((key, i) => (
        <View key={key}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
          <ItemRow meta={ITEM_META[key] ?? { label: key, hint: 'Update this item' }} />
        </View>
      ))}
      <View style={{ height: 8 }} />
    </View>
  );
}

function ItemRow({ meta }: { meta: { label: string; hint: string } }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 12 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: `${colors.warning}26`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.warning }}>!</Text>
      </View>
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textJet} weight="600" align="left">
          {meta.label}
        </AppText>
        <View style={{ height: 2 }} />
        <AppText variant="bodySmall" color={colors.textMuted} align="left">
          {meta.hint}
        </AppText>
      </View>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AppText variant="body" color={colors.textMuted} align="center">
        {message}
      </AppText>
      <View style={{ height: 12 }} />
      <AppButton label="Try again" radius={100} onPress={onRetry} />
    </View>
  );
}
