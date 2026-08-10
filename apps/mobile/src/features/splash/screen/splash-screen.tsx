import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { Image, View } from 'react-native';

import { useAuthSession } from '@features/auth/providers/auth-session-provider';
import { onboardingApi } from '@features/onboarding/api/onboarding-api';
import { markBootRouted, markBootSplashPainted } from '@shared/boot/boot-splash';
import { IMAGES } from '@shared/config/images';
import { ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';

type SplashNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

type SplashDestination =
  | 'Onboarding'
  | 'Home'
  | 'KycRejected'
  | 'ProfessionalKyc'
  | 'ClientKyc'
  | 'RoleSelection';

/**
 * Floor on how long the splash artwork stays up on a cold start. Routing
 * resolves in a couple hundred ms on a good connection, and a splash that
 * vanishes that fast reads as a glitchy flash, not a brand moment. Routing
 * runs concurrently — this only pads the fast case, it never adds to a slow
 * one (a 3s restore still shows the splash for exactly 3s).
 */
const MIN_SPLASH_VISIBLE_MS = 1200;

/**
 * Boot router AND the visible boot splash on Android. Routing starts
 * immediately on mount, while the native splash is still up. On iOS the
 * native splash is this exact artwork and stays until routing resolves, so
 * this screen is only seen when routing outlives the cap (slow network /
 * offline restore). On Android the OS splash can't draw the background image,
 * so boot-splash.ts hands off to this screen the moment it paints — it IS the
 * splash there. Split rationale in boot-splash.ts.
 */
export function SplashScreen() {
  const navigation = useNavigation<SplashNavigationProp>();
  const { restore, setOnboardingStep } = useAuthSession();
  const hasRouted = useRef(false);

  // Intentionally runs once on mount — `route` closes over `restore` and
  // `setOnboardingStep`, which are stable useCallback references from
  // AuthSessionProvider, so there's nothing to re-fire on.
  useEffect(() => {
    void route();
  }, []);

  async function route() {
    if (hasRouted.current) return;
    hasRouted.current = true;
    const shownAt = Date.now();

    try {
      const destination = await resolveDestination();

      // Hold the artwork up to the floor — see MIN_SPLASH_VISIBLE_MS.
      const elapsed = Date.now() - shownAt;
      if (elapsed < MIN_SPLASH_VISIBLE_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_VISIBLE_MS - elapsed));
      }

      navigation.reset({ index: 0, routes: [{ name: destination }] });
    } finally {
      // Even a throw is a routing outcome (the error boundary is the
      // destination) — the native splash must never outlive this.
      markBootRouted();
    }
  }

  async function resolveDestination(): Promise<SplashDestination> {
    // restore() re-hydrates the in-memory session from stored tokens (a
    // persisted refresh token from a previous run counts as "logged in" —
    // the api client mints a new access token on the first protected
    // request, or force-logs-out if it can't) and resolves with whether
    // that ended up authenticated.
    const hasSession = await restore();

    if (!hasSession) {
      return 'Onboarding';
    }

    // Logged in — fetch onboarding status and route by step. Mirror the
    // result into the session context so the navigator guard stays in sync
    // for the rest of the session.
    try {
      const status = await onboardingApi.getStatus();
      switch (status.step) {
        case 'complete':
          setOnboardingStep('complete');
          return 'Home';
        case 'kycRejected':
          setOnboardingStep('kycRejected');
          return 'KycRejected';
        case 'professionalKyc':
          setOnboardingStep('professionalKyc');
          return 'ProfessionalKyc';
        case 'clientKyc':
          setOnboardingStep('clientKyc');
          return 'ClientKyc';
        case 'roleSelection':
          setOnboardingStep('roleSelection');
          return 'RoleSelection';
        default:
          // Unknown step from a newer backend — Home is the safe landing for
          // an authenticated user (the old code left the splash stuck here).
          return 'Home';
      }
    } catch (error) {
      if (error instanceof ApiError) {
        // Couldn't reach the server — drop into home and let the screen show
        // its own error state on first read. The api client force-logs-out
        // if the session is dead.
        return 'Home';
      }
      throw error;
    }
  }

  return (
    // onLayout: first frame is down — on Android this is what lets the native
    // splash hand off to this screen's artwork (see boot-splash.ts).
    <View className="flex-1" onLayout={markBootSplashPainted}>
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
