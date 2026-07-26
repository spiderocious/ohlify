import { AppErrorBoundary, ModalHost, ToastHost } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useState } from 'react';
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

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View className="flex-1" onLayout={onLayoutRootView}>
        <AppErrorBoundary>
          <AppProvider>
            <StatusBar style="dark" />
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
            <ToastHost />
            <ModalHost />
          </AppProvider>
        </AppErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}
