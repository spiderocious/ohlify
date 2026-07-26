import { AppButton, AppMarkdown, AppText, colors } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, View } from 'react-native';

import { appVersion, deviceInfo } from '@shared/services/device-info';

import { appVersionApi, UpgradeStatus, type AppVersionCheck } from '../api/app-version-api';

/**
 * Blocks the app when the installed build has fallen below the minimum.
 *
 * Re-checks on resume as well as at cold start, so a release pushed while
 * someone had the app backgrounded takes effect the next time they look at it
 * rather than waiting for them to fully restart.
 *
 * Any failure — network down, endpoint unreachable — leaves children rendered.
 * A version check that cannot complete must never be the thing that locks
 * someone out of the app.
 */
export function UpgradeGate({ children }: { children: React.ReactNode }) {
  const [check, setCheck] = useState<AppVersionCheck | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);

  const runCheck = useCallback(() => {
    const { platform } = deviceInfo();
    appVersionApi
      .check({ platform, version: appVersion() })
      .then(setCheck)
      .catch(() => setCheck(undefined));
  }, []);

  useEffect(() => {
    runCheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });
    return () => sub.remove();
  }, [runCheck]);

  const status = check?.status ?? UpgradeStatus.OK;
  const isForced = status === UpgradeStatus.FORCED;
  const isOptional = status === UpgradeStatus.OPTIONAL && !dismissed;

  if (!check || (!isForced && !isOptional)) return <>{children}</>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}>
        <AppText variant="title" weight="800" color={colors.textJet} align="center">
          {check.title}
        </AppText>
        {check.descriptionMd ? (
          <>
            <View style={{ height: 14 }} />
            <AppMarkdown source={check.descriptionMd} align="center" />
          </>
        ) : null}
        <View style={{ height: 28 }} />
        <AppButton
          label="Update now"
          expanded
          radius={100}
          onPress={() => void Linking.openURL(check.storeUrl)}
        />
        {isForced ? null : (
          <>
            <View style={{ height: 10 }} />
            <AppButton
              label="Not now"
              expanded
              radius={100}
              variant="outline"
              onPress={() => setDismissed(true)}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
