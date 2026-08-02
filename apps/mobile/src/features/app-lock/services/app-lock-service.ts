import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Local app lock.
 *
 * The PIN never leaves the device and is not a server credential — it guards
 * the screen, not the account. Losing it therefore cannot lock anyone out of
 * their money: signing out and back in clears the lock entirely.
 *
 * Stored as a salted SHA-256 digest in the keychain rather than in plain text,
 * so a device backup or a keychain dump does not hand over the PIN itself.
 */
const PIN_HASH_KEY = 'ohlify.applock.pin';
const PIN_SALT_KEY = 'ohlify.applock.salt';
const BIOMETRICS_KEY = 'ohlify.applock.biometrics';

/**
 * expo-secure-store has no web implementation — its web module is an empty
 * stub, so calling it throws `getValueWithKeyAsync is not a function` and takes
 * the whole provider tree down before anything renders. Web falls back to
 * AsyncStorage (localStorage there), exactly as `shared/services/token-service.ts`
 * already does. The lock is a screen guard, not a secret store, and web is a
 * development/QA target rather than a shipped surface.
 */
const isWeb = Platform.OS === 'web';

const secureGet = (key: string): Promise<string | null> =>
  isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);

const secureSet = (key: string, value: string): Promise<void> =>
  isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);

const secureDelete = (key: string): Promise<void> =>
  isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);

const randomSalt = (): string =>
  Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

/**
 * Digests the PIN with a per-install salt.
 *
 * Expo's crypto module is imported lazily so the rest of the lock still works
 * on a build where it is unavailable — a plain comparison is a poor fallback,
 * so we fail closed instead and report the PIN as unset.
 */
async function digest(pin: string, salt: string): Promise<string | null> {
  try {
    const Crypto = await import('expo-crypto');
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${salt}:${pin}`,
    );
  } catch {
    return null;
  }
}

export const appLockService = {
  async isPinSet(): Promise<boolean> {
    return (await secureGet(PIN_HASH_KEY)) !== null;
  },

  async setPin(pin: string): Promise<boolean> {
    const salt = randomSalt();
    const hash = await digest(pin, salt);
    if (!hash) return false;
    await secureSet(PIN_SALT_KEY, salt);
    await secureSet(PIN_HASH_KEY, hash);
    return true;
  },

  async verifyPin(pin: string): Promise<boolean> {
    const [salt, stored] = await Promise.all([
      secureGet(PIN_SALT_KEY),
      secureGet(PIN_HASH_KEY),
    ]);
    if (!salt || !stored) return false;
    const hash = await digest(pin, salt);
    return hash !== null && hash === stored;
  },

  /** Clears everything. Called on sign-out so the next user is not locked out. */
  async clear(): Promise<void> {
    await Promise.all([
      secureDelete(PIN_HASH_KEY),
      secureDelete(PIN_SALT_KEY),
      secureDelete(BIOMETRICS_KEY),
    ]);
  },

  async isBiometricsAvailable(): Promise<boolean> {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  },

  async isBiometricsEnabled(): Promise<boolean> {
    return (await secureGet(BIOMETRICS_KEY)) === 'true';
  },

  /**
   * Biometrics require a PIN first.
   *
   * A sensor that stops recognising someone — wet hands, a cracked screen, a
   * failed enrolment — would otherwise leave them with no way in at all. The
   * PIN is the fallback that makes biometrics safe to offer.
   */
  async setBiometricsEnabled(enabled: boolean): Promise<boolean> {
    if (enabled && !(await this.isPinSet())) return false;
    await secureSet(BIOMETRICS_KEY, enabled ? 'true' : 'false');
    return true;
  },

  async authenticateWithBiometrics(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Ohlify',
      fallbackLabel: 'Use PIN',
      // The OS passcode is a different secret from our PIN; offering it would
      // let someone who knows the device code bypass a lock the user set
      // specifically to keep this app private on a shared phone.
      disableDeviceFallback: true,
    });
    return result.success;
  },
};
