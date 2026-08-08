import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAppLock } from '../providers/app-lock-provider';
import { appLockService } from '../services/app-lock-service';
import { PinPad } from './parts/pin-pad';

const PIN_LENGTH = 4;

/**
 * Covers the app until the user proves it is theirs.
 *
 * Biometrics are offered first when enabled, because that is the fast path; the
 * PIN is always reachable underneath so a sensor that will not cooperate never
 * becomes a dead end.
 */
export function LockScreen() {
  const { unlock, biometricsEnabled } = useAppLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const tryBiometrics = useCallback(async () => {
    if (!biometricsEnabled) return;
    if (!(await appLockService.isBiometricsAvailable())) return;
    // A refusal is not an error — the PIN pad is already on screen behind this.
    if (await appLockService.authenticateWithBiometrics()) unlock();
  }, [biometricsEnabled, unlock]);

  useEffect(() => {
    void tryBiometrics();
  }, [tryBiometrics]);

  const onKey = (digit: string): void => {
    setError(undefined);
    const next = (pin + digit).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    void appLockService.verifyPin(next).then((ok) => {
      if (ok) {
        unlock();
        return;
      }
      setPin('');
      setError('Wrong PIN. Try again.');
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <AppText variant="title" weight="800" color={colors.textJet} align="center">
          Enter your PIN
        </AppText>
        <View style={{ height: 8 }} />
        <AppText variant="bodySmall" color={colors.textMuted} align="center">
          Ohlify is locked on this device.
        </AppText>
        <View style={{ height: 32 }} />

        <PinPad
          length={PIN_LENGTH}
          filled={pin.length}
          error={error}
          onKey={onKey}
          onDelete={() => {
            setError(undefined);
            setPin((p) => p.slice(0, -1));
          }}
        />

        {biometricsEnabled ? (
          <>
            <View style={{ height: 24 }} />
            <AppButton
              label="Use biometrics"
              variant="outline"
              radius={100}
              onPress={() => void tryBiometrics()}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}
