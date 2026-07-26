import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

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
    return (await SecureStore.getItemAsync(PIN_HASH_KEY)) !== null;
  },

  async setPin(pin: string): Promise<boolean> {
    const salt = randomSalt();
    const hash = await digest(pin, salt);
    if (!hash) return false;
    await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
    return true;
  },

  async verifyPin(pin: string): Promise<boolean> {
    const [salt, stored] = await Promise.all([
      SecureStore.getItemAsync(PIN_SALT_KEY),
      SecureStore.getItemAsync(PIN_HASH_KEY),
    ]);
    if (!salt || !stored) return false;
    const hash = await digest(pin, salt);
    return hash !== null && hash === stored;
  },

  /** Clears everything. Called on sign-out so the next user is not locked out. */
  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(PIN_HASH_KEY),
      SecureStore.deleteItemAsync(PIN_SALT_KEY),
      SecureStore.deleteItemAsync(BIOMETRICS_KEY),
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
    return (await SecureStore.getItemAsync(BIOMETRICS_KEY)) === 'true';
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
    await SecureStore.setItemAsync(BIOMETRICS_KEY, enabled ? 'true' : 'false');
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
