import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * What this build is running on. Sent with sign-in, registration, and push
 * token registration so support can answer "what were they actually using?"
 * without asking, and so campaign targeting can segment on it later.
 *
 * Every field is best-effort: on a simulator or a stripped build some are
 * simply unavailable, and a missing device name must never block a login.
 */
export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  app_version: string;
  device_name: string | null;
  device_model: string | null;
  os_version: string | null;
}

const platform = (): DeviceInfo['platform'] => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return 'web';
};

/** The version the store knows this build as. Drives the upgrade gate. */
export const appVersion = (): string => Constants.expoConfig?.version ?? '0.0.0';

export const deviceInfo = (): DeviceInfo => ({
  platform: platform(),
  app_version: appVersion(),
  // `deviceName` is the user's own label ("Feranmi's iPhone"); `modelName` is
  // the hardware. Both help, and they answer different support questions.
  device_name: Device.deviceName ?? null,
  device_model: Device.modelName ?? null,
  os_version: Device.osVersion ?? null,
});
