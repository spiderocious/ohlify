import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppIcon, AppIconButton, AppText, colors, KycProgressHeader, showToast } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { onboardingApi } from '@features/onboarding/api/onboarding-api';
import { useKycSpec } from '@features/onboarding/providers/kyc-spec-provider';
import { kycItemKeyToWire } from '@features/onboarding/types/kyc-spec';
import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import { KycItemsList } from './parts/kyc-items-list';

/**
 * Mirrors mobile/lib/features/onboarding/screen/professional_kyc_screen.dart.
 * KycSpecProvider (route-shell scoped, see ProfessionalKycRoute in
 * app.navigation.tsx) supplies the spec; this screen composes the progress
 * header + item list + proceed/logout actions.
 */
type ProfessionalKycNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfessionalKyc'>;

/** Keys whose acknowledgement doesn't go through PATCH /onboarding/kyc/* — they live behind their own routes. */
const PASSIVELY_ACKNOWLEDGED = new Set(['bank_account', 'rates']);

export function ProfessionalKycScreen() {
  const navigation = useNavigation<ProfessionalKycNavigationProp>();
  const { logout } = useAuthSession();
  const { spec, isLoading, error, ensureLoaded, refetch } = useKycSpec();
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  function readyToProceed(): boolean {
    if (!spec) return false;
    const keys = spec.resubmission?.itemKeys;
    if (!keys || keys.length === 0) return spec.allComplete;

    const keySet = new Set(keys);
    const scoped = spec.items.filter((i) => i.enabled && i.required && keySet.has(kycItemKeyToWire(i.key)));
    if (scoped.length === 0) return false;
    if (!scoped.every((i) => i.complete)) return false;

    const acknowledged = new Set(spec.resubmission?.acknowledgedKeys ?? []);
    for (const k of keys) {
      if (acknowledged.has(k)) continue;
      if (PASSIVELY_ACKNOWLEDGED.has(k)) {
        // Searches the FULL item list (not `scoped`), falling back to
        // scoped[0] if not found — matches spec.items.firstWhere(...,
        // orElse: () => list.first) in the Dart source exactly.
        const item = spec.items.find((i) => kycItemKeyToWire(i.key) === k) ?? scoped[0];
        if (!item?.complete) return false;
      } else {
        return false;
      }
    }
    return true;
  }

  async function logoutAndGoToLogin() {
    await logout();
    // This screen sits directly on RootStack (ProfessionalKycRoute is a
    // top-level RootStack.Screen, not nested in another navigator), so
    // `navigation` here already IS the root navigator — no getParent() hop
    // needed. (Contrast with ProfileScreen's logout, which needs two
    // getParent() hops since it's nested ProfileStack -> Tab.Navigator ->
    // RootStack.)
    navigation.reset({ index: 0, routes: [{ name: 'Auth', params: { screen: 'Login' } }] });
  }

  async function proceed() {
    if (!spec || !readyToProceed() || completing) return;
    setCompleting(true);
    try {
      await onboardingApi.completeKyc();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.reason === 'kyc_incomplete') {
          const missing = err.fieldErrors.incomplete_items ?? [];
          showToast(missing.length === 0 ? 'Some items are still missing.' : `Still incomplete: ${missing.join(', ')}`, {
            type: 'error',
          });
          await refetch();
        } else if (err.reason === 'resubmit_unchanged') {
          const stale = err.fieldErrors.item_keys ?? [];
          showToast(stale.length === 0 ? 'Update the flagged items before resubmitting.' : `Update ${stale.join(', ')} before resubmitting.`, {
            type: 'error',
          });
          await refetch();
        } else {
          showToast(apiErrorMessage(err), { type: 'error' });
        }
      } else {
        throw err;
      }
    } finally {
      setCompleting(false);
    }
  }

  const canProceed = spec !== null && readyToProceed() && !completing;
  const isResubmit = (spec?.resubmission?.itemKeys.length ?? 0) > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
          <AppIconButton
            icon={<AppIcon name="back" size={18} color={colors.textJet} />}
            variant="ghost"
            backgroundColor={colors.background}
            size={44}
            onPress={() => navigation.goBack()}
          />
          <View style={{ width: 12 }} />
          <AppText variant="header" color={colors.textJet} weight="700" align="left">
            Become a Professional
          </AppText>
        </View>

        <View style={{ flex: 1 }}>
          <Body spec={spec} isLoading={isLoading} error={error} onRetry={refetch} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
          <AppButton
            label={completing ? 'Submitting…' : isResubmit ? 'Resubmit for review' : 'Proceed'}
            expanded
            radius={100}
            isDisabled={!canProceed}
            onPress={canProceed ? proceed : undefined}
          />
          <View style={{ height: 10 }} />
          <AppButton label="Log out" variant="plain" expanded radius={100} isDisabled={completing} onPress={completing ? undefined : logoutAndGoToLogin} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function Body({
  spec,
  isLoading,
  error,
  onRetry,
}: {
  spec: ReturnType<typeof useKycSpec>['spec'];
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}) {
  if (isLoading && !spec) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error && !spec) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AppText variant="body" color={colors.textMuted} align="center">
          {apiErrorMessage(error)}
        </AppText>
        <View style={{ height: 12 }} />
        <AppButton label="Try again" radius={100} onPress={onRetry} />
      </View>
    );
  }
  if (!spec) return null;

  const visibleItems = spec.items.filter((i) => i.enabled);
  const resubmitKeys = spec.resubmission?.itemKeys;
  const isPartial = Boolean(resubmitKeys && resubmitKeys.length > 0);
  const scopedItems = isPartial ? visibleItems.filter((i) => resubmitKeys?.includes(kycItemKeyToWire(i.key))) : visibleItems;
  const requiredItems = scopedItems.filter((i) => i.required);
  const completedRequired = requiredItems.filter((i) => i.complete).length;
  const percent = requiredItems.length === 0 ? 0 : Math.round((completedRequired / requiredItems.length) * 100);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
      <KycProgressHeader completed={completedRequired} total={requiredItems.length} percent={percent} />
      <View style={{ height: 20 }} />
      <AppText variant="body" color={colors.textMuted} align="left">
        {isPartial ? 'Items to update' : 'Setup steps'}
      </AppText>
      <View style={{ height: 10 }} />
      <KycItemsList role="professional" items={visibleItems} resubmitKeys={resubmitKeys} />
    </ScrollView>
  );
}
