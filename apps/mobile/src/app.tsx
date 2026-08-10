import { AppErrorBoundary, AppSafeArea, ModalHost, ToastHost } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { markAppTreeReady } from '@shared/boot/boot-splash';
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

  // The native splash lifecycle lives in boot-splash.ts: it hides once the
  // tree is ready AND the Splash route has resolved where to go (capped, so
  // gate paths and slow networks fall through to the JS splash instead of
  // hanging on the native one). This effect only reports readiness — the
  // early-return below guarantees nothing needing fonts paints before it.
  useEffect(() => {
    if (!appReady) return;
    markAppTreeReady();
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
