import { useNavigation } from '@react-navigation/native';
import { AppButton, AppText, colors, showToast } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppLock } from '../providers/app-lock-provider';
import { appLockService } from '../services/app-lock-service';
import { PinPad } from './parts/pin-pad';

const PIN_LENGTH = 4;

type Stage = 'idle' | 'choose' | 'confirm';

/**
 * Turns the local app lock on and off.
 *
 * Setting a PIN takes two entries so a mistyped one cannot lock the user out of
 * their own screen. Biometrics stay disabled until a PIN exists — the PIN is
 * the fallback that makes a sensor safe to rely on.
 */
export function AppLockSettingsScreen() {
  const navigation = useNavigation();
  const { isPinSet, biometricsEnabled, refreshSettings } = useAppLock();
  const [stage, setStage] = useState<Stage>('idle');
  const [firstEntry, setFirstEntry] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    void appLockService.isBiometricsAvailable().then(setBiometricsAvailable);
  }, []);

  const reset = useCallback(() => {
    setStage('idle');
    setFirstEntry('');
    setPin('');
    setError(undefined);
  }, []);

  const onKey = (digit: string): void => {
    setError(undefined);
    const next = (pin + digit).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length < PIN_LENGTH) return;

    if (stage === 'choose') {
      setFirstEntry(next);
      setPin('');
      setStage('confirm');
      return;
    }

    if (next !== firstEntry) {
      setPin('');
      setFirstEntry('');
      setStage('choose');
      setError('Those didn’t match. Start again.');
      return;
    }

    void appLockService.setPin(next).then(async (ok) => {
      if (!ok) {
        setError('Could not save your PIN on this device.');
        return;
      }
      await refreshSettings();
      reset();
      showToast('App lock is on.', { type: 'success' });
    });
  };

  const toggleBiometrics = (enabled: boolean): void => {
    void appLockService.setBiometricsEnabled(enabled).then(async (ok) => {
      if (!ok) {
        showToast('Set a PIN first — it’s the fallback if biometrics fail.', { type: 'error' });
        return;
      }
      await refreshSettings();
    });
  };

  const turnOff = (): void => {
    void appLockService.clear().then(async () => {
      await refreshSettings();
      showToast('App lock is off.', { type: 'info' });
    });
  };

  if (stage !== 'idle') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <AppText variant="title" weight="800" color={colors.textJet} align="center">
            {stage === 'choose' ? 'Choose a PIN' : 'Confirm your PIN'}
          </AppText>
          <View style={{ height: 8 }} />
          <AppText variant="bodySmall" color={colors.textMuted} align="center">
            This stays on your device. It never leaves it, and it isn’t your password.
          </AppText>
          <View style={{ height: 32 }} />
          <PinPad
            length={PIN_LENGTH}
            filled={pin.length}
            error={error}
            onKey={onKey}
            onDelete={() => setPin((p) => p.slice(0, -1))}
          />
          <View style={{ height: 24 }} />
          <Pressable onPress={reset}>
            <AppText variant="body" color={colors.textMuted}>
              Cancel
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <AppText variant="title" weight="800" color={colors.textJet} align="left">
          App lock
        </AppText>
        <View style={{ height: 6 }} />
        <AppText variant="bodySmall" color={colors.textMuted} align="left">
          Ask for a PIN when Ohlify opens. Incoming calls still ring through, so you never miss one
          while locked.
        </AppText>
        <View style={{ height: 24 }} />

        {isPinSet ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="600" color={colors.textJet} align="left">
                  Unlock with biometrics
                </AppText>
                <AppText variant="bodySmall" color={colors.textMuted} align="left">
                  {biometricsAvailable
                    ? 'Your PIN still works if it fails.'
                    : 'Not set up on this device.'}
                </AppText>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={toggleBiometrics}
                disabled={!biometricsAvailable}
              />
            </View>
            <View style={{ height: 12 }} />
            <AppButton label="Change PIN" variant="outline" expanded radius={100} onPress={() => setStage('choose')} />
            <View style={{ height: 10 }} />
            <AppButton label="Turn off app lock" variant="outline" expanded radius={100} onPress={turnOff} />
          </>
        ) : (
          <AppButton label="Set a PIN" expanded radius={100} onPress={() => setStage('choose')} />
        )}

        <View style={{ height: 20 }} />
        <Pressable onPress={() => navigation.goBack()}>
          <AppText variant="body" color={colors.textMuted} align="center">
            Back
          </AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
