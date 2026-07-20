import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { Image, View } from 'react-native';

import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { onboardingApi } from '@features/onboarding/api/onboarding-api';
import { IMAGES } from '@shared/config/images';
import { ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';

/**
 * Mirrors mobile/lib/features/splash/screen/splash_screen.dart exactly:
 * 2s timer, then route by auth/onboarding status.
 */
const SPLASH_DELAY_MS = 2000;

type SplashNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export function SplashScreen() {
  const navigation = useNavigation<SplashNavigationProp>();
  const { restore, setOnboardingStep } = useAuthSession();
  const hasRouted = useRef(false);

  // Intentionally runs once on mount — `route` closes over `restore` and
  // `setOnboardingStep`, which are stable useCallback references from
  // AuthSessionProvider, so there's nothing to re-fire on.
  useEffect(() => {
    const timer = setTimeout(() => {
      void route();
    }, SPLASH_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  async function route() {
    if (hasRouted.current) return;
    hasRouted.current = true;

    // restore() re-hydrates the in-memory session from stored tokens (a
    // persisted refresh token from a previous run counts as "logged in" —
    // the api client mints a new access token on the first protected
    // request, or force-logs-out if it can't) and resolves with whether
    // that ended up authenticated.
    const hasSession = await restore();

    if (!hasSession) {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      return;
    }

    // Logged in — fetch onboarding status and route by step. Mirror the
    // result into the session context so the navigator guard stays in sync
    // for the rest of the session.
    try {
      const status = await onboardingApi.getStatus();
      switch (status.step) {
        case 'complete':
          setOnboardingStep('complete');
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          break;
        case 'kycRejected':
          setOnboardingStep('kycRejected');
          navigation.reset({ index: 0, routes: [{ name: 'KycRejected' }] });
          break;
        case 'professionalKyc':
          setOnboardingStep('professionalKyc');
          navigation.reset({ index: 0, routes: [{ name: 'ProfessionalKyc' }] });
          break;
        case 'clientKyc':
          setOnboardingStep('clientKyc');
          navigation.reset({ index: 0, routes: [{ name: 'ClientKyc' }] });
          break;
        case 'roleSelection':
          setOnboardingStep('roleSelection');
          navigation.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
          break;
      }
    } catch (error) {
      if (error instanceof ApiError) {
        // Couldn't reach the server — drop into home and let the screen show
        // its own error state on first read. The api client force-logs-out
        // if the session is dead.
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        return;
      }
      throw error;
    }
  }

  return (
    <View className="flex-1">
      <Image
        source={IMAGES.splash}
        className="absolute inset-0 h-full w-full"
        resizeMode="cover"
      />
      <View className="flex-1 items-center justify-center">
        <Image
          source={IMAGES.logoWithTextWhite}
          style={{ width: 160, height: (160 * 59) / 173 }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
