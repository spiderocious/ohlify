import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppButton,
  AppText,
  colors,
  showConfirmationModal,
  showFeedbackModal,
  showToast,
} from '@ohlify/mobile-ui';
import type { Role } from '@ohlify/core';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { onboardingApi } from '@features/onboarding/api/onboarding-api';
import type { RoleResult } from '@features/onboarding/types/role-result';
import { tokenService } from '@shared/services/token-service';
import { ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import { RoleCard } from './parts/role-card';

/** Mirrors mobile/lib/features/role_selection/screen/role_selection_screen.dart. */
const ROLE_LABEL: Record<Role, string> = { client: 'Client', professional: 'Professional' };

type RoleSelectionNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RoleSelection'>;

function routeForRole(role: Role): keyof RootStackParamList {
  return role === 'professional' ? 'ProfessionalKyc' : 'ClientKyc';
}

export function RoleSelectionScreen() {
  const navigation = useNavigation<RoleSelectionNavigationProp>();
  const [selected, setSelected] = useState<Role>();
  const [submitting, setSubmitting] = useState(false);
  // Captures the confirm intent across the confirmation modal's dismiss
  // promise — mirrors the Dart source's `_confirmed` field, which exists so
  // the success feedback modal only shows after the confirmation modal has
  // fully closed (avoids the two overlapping).
  const confirmedRef = useRef(false);

  function onContinue() {
    const role = selected;
    if (!role || submitting) return;

    const confirmation = showConfirmationModal(
      `Continue as ${ROLE_LABEL[role]}?`,
      role === 'professional'
        ? 'You will need to complete a short profile so clients can discover and book you.'
        : 'You will be able to browse and book professionals right away. You can switch later.',
      {
        kind: 'info',
        confirmButtonText: 'Yes, continue',
        cancelButtonText: 'Change',
        onConfirm: () => {
          confirmedRef.current = true;
        },
      },
    );

    confirmation.onDismissed.then(() => {
      if (!confirmedRef.current) return;
      confirmedRef.current = false;
      void submitRole(role);
    });
  }

  async function submitRole(role: Role) {
    setSubmitting(true);
    try {
      const result = await onboardingApi.setRole(role);
      // Persist the freshly-minted JWT pair BEFORE the success modal +
      // navigation. The server invalidated our previous access token at the
      // same instant it minted these — every subsequent gated call (rates,
      // handle, KYC) will 401 if we don't save first.
      if (result.tokens) {
        await tokenService.setTokens({
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        });
      }
      showSuccessModal(result);
    } catch (error) {
      if (error instanceof ApiError) {
        // role_already_set (409) means the user came back to this screen but
        // the server already has a role. Honor what the server says rather
        // than fight it — fetch status and route accordingly.
        if (error.reason === 'role_already_set') {
          await routeFromStatus();
          return;
        }
        showToast(error.message, { type: 'error' });
      } else {
        throw error;
      }
    } finally {
      setSubmitting(false);
    }
  }

  function showSuccessModal(result: RoleResult) {
    const role = result.role;
    showFeedbackModal(
      'Role saved successfully',
      role === 'professional'
        ? "You are all set as a Professional. Let's complete your profile next."
        : 'You are all set as a Client. Find a professional and book a call whenever you are ready.',
      {
        kind: 'success',
        position: 'fullscreen',
        showCloseButton: false,
        dismissible: false,
        confirmButtonText: 'Complete my profile',
        onConfirm: () => navigation.reset({ index: 0, routes: [{ name: routeForRole(role) }] }),
      },
    );
  }

  async function routeFromStatus() {
    try {
      const status = await onboardingApi.getStatus();
      switch (status.step) {
        case 'complete':
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          return;
        case 'professionalKyc':
          navigation.reset({ index: 0, routes: [{ name: 'ProfessionalKyc' }] });
          return;
        case 'clientKyc':
          navigation.reset({ index: 0, routes: [{ name: 'ClientKyc' }] });
          return;
        case 'kycRejected':
          navigation.reset({ index: 0, routes: [{ name: 'KycRejected' }] });
          return;
        case 'roleSelection':
          // No-op — stay on this screen, server says we still need to pick.
          return;
      }
    } catch (error) {
      if (error instanceof ApiError) showToast(error.message, { type: 'error' });
      else throw error;
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surfaceLight }}>
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24, paddingBottom: 24 }}>
          <AppText variant="title" color={colors.textJet} weight="800" align="left">
            How will you use Ohlify?
          </AppText>
          <View style={{ height: 6 }} />
          <AppText variant="body" color={colors.textMuted} align="left">
            Pick the option that fits best. You can change this later from your profile settings.
          </AppText>
          <View style={{ height: 24 }} />

          <RoleCard
            title="I'm a Client"
            subtitle="Find and book short paid calls with experts across any field."
            icon="search"
            bullets={[
              'Browse verified professionals',
              'Book audio or video calls',
              'Pay per minute, no subscription',
            ]}
            selected={selected === 'client'}
            onPress={() => setSelected('client')}
          />
          <View style={{ height: 14 }} />
          <RoleCard
            title="I'm a Professional"
            subtitle="Get paid for your time. Let people book short calls with you."
            icon="workspacePremium"
            bullets={[
              'Set your own rates and availability',
              'Accept audio or video bookings',
              'Withdraw earnings to your bank',
            ]}
            selected={selected === 'professional'}
            onPress={() => setSelected('professional')}
          />
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
          <AppButton
            label={submitting ? 'Saving…' : 'Continue'}
            expanded
            radius={100}
            isDisabled={!selected || submitting}
            onPress={!selected || submitting ? undefined : onContinue}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
