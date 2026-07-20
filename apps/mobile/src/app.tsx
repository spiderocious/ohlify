import { AppErrorBoundary, ModalHost, ToastHost } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FONT_ASSETS } from '@shared/config/fonts';
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
            <AppNavigation />
            <ToastHost />
            <ModalHost />
          </AppProvider>
        </AppErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}
