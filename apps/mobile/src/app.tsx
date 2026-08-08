import { AppErrorBoundary, AppSafeArea, ModalHost, ToastHost } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FONT_ASSETS } from '@shared/config/fonts';
import { initForegroundPush } from '@shared/push/push-service';
import { initAmountVisibility } from '@shared/services/amount-visibility-storage';
import { AppLockGate } from '@features/app-lock/screen/app-lock-gate';
import { AppLockProvider } from '@features/app-lock/providers/app-lock-provider';
import { UpgradeGate } from '@features/app-version/screen/upgrade-gate';
import { FirstRunGate } from '@features/first-run/screen/first-run-gate';
import { AppNavigation } from './app.navigation';
import { AppProvider } from './app.provider';

import './shared/styles/global.css';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden / not supported on this platform (e.g. some web contexts) — non-fatal.
});

/**
 * Matches `splashscreen_background` in android/app/src/main/res/values/colors.xml
 * and the `expo-splash-screen` backgroundColor in app.config.ts. Used for the
 * pre-ready frame so it is indistinguishable from the splash still on screen.
 */
const SPLASH_BACKGROUND = '#4A3FE5';

export function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError]);

  // Notification channels + foreground push listeners + cold-start
  // notification-tap intents. Idempotent; no-op on web.
  useEffect(() => {
    void initForegroundPush();
    void initAmountVisibility();
  }, []);

  // Hide the native splash only once the real tree is mounted and laid out.
  //
  // This used to be an `onLayout` handler, which cannot fire while `appReady`
  // is false because the component returned `null` — nothing to lay out. The
  // splash was therefore torn down by Expo's own timeout with an empty tree
  // behind it, which is the white screen with a small centred logo: the OS
  // window background plus a shrunken splash image, not a screen the app drew.
  //
  // Driving it from an effect keyed on `appReady` ties the hide to the thing
  // that actually matters — the app being ready to paint.
  useEffect(() => {
    if (!appReady) return;
    SplashScreen.hideAsync().catch(() => {
      // Already hidden, or unsupported on this platform — non-fatal.
    });
  }, [appReady]);

  if (!appReady) {
    // The splash is still up at this point, so this only has to avoid painting
    // over it. It must not be `null`: an empty tree is what let the splash tear
    // down early in the first place.
    return <View style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }} />;
  }

  return (
    <SafeAreaProvider>
      <View className="flex-1">
        <AppErrorBoundary>
          <AppProvider>
            {/* Light icons: the status bar band is painted in the brand indigo
                (see AppSafeArea), so dark icons would be unreadable on it. */}
            <StatusBar style="light" />
            {/* Every screen renders inside AppSafeArea, which reserves the
                status-bar and navigation-bar insets once at the root. Screens
                below can use their full container height without knowing a
                system bar exists — no per-screen SafeAreaView, no per-component
                inset arithmetic. */}
            <AppSafeArea>
              {/* Wraps navigation, not the providers: a forced upgrade must
                  replace every screen, but the gate itself needs the API client
                  the providers set up. */}
              {/* Upgrade outranks lock: a build that must be replaced should say
                  so before asking for a PIN it may not even honour any more. */}
              <UpgradeGate>
                <AppLockProvider>
                  <AppLockGate>
                    {/* Inside the lock: warming the cache for someone who has not
                        proved the device is theirs would leak their data onto a
                        locked screen. */}
                    <FirstRunGate>
                      <AppNavigation />
                    </FirstRunGate>
                  </AppLockGate>
                </AppLockProvider>
              </UpgradeGate>
            </AppSafeArea>
            {/* Outside AppSafeArea: these are full-screen overlays that position
                themselves against the whole window, and they already handle
                their own insets. */}
            <ToastHost />
            <ModalHost />
          </AppProvider>
        </AppErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}
