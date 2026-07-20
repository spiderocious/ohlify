import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Mirrors mobile/lib/shared/services/token_service.dart. Tokens are stored
 * in Keychain (iOS) / EncryptedSharedPreferences (Android) via
 * expo-secure-store. expo-secure-store has NO web implementation (its web
 * module is an empty stub — verified in node_modules/expo-secure-store/src/
 * ExpoSecureStore.web.ts), so on web we use AsyncStorage instead, which is
 * backed by plain localStorage there — the same trust tradeoff Flutter's
 * SharedPreferences-on-web fallback makes (see the Dart source comment).
 *
 * In-memory cache provides synchronous getters used by the auth interceptor.
 */
const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

const isWeb = Platform.OS === 'web';

async function storageGet(key: string): Promise<string | null> {
  return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function storageDelete(key: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

class TokenServiceImpl {
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;

  get accessToken(): string | null {
    return this._accessToken;
  }
  get refreshToken(): string | null {
    return this._refreshToken;
  }
  get hasSession(): boolean {
    return this._refreshToken !== null;
  }

  /** Call once on app start — see app.tsx. */
  async init(): Promise<void> {
    try {
      const [access, refresh] = await Promise.all([
        storageGet(ACCESS_KEY),
        storageGet(REFRESH_KEY),
      ]);
      this._accessToken = access;
      this._refreshToken = refresh;
    } catch {
      this._accessToken = null;
      this._refreshToken = null;
    }
  }

  async setTokens(params: { accessToken: string; refreshToken: string }): Promise<void> {
    this._accessToken = params.accessToken;
    this._refreshToken = params.refreshToken;
    await this.persist({ access: params.accessToken, refresh: params.refreshToken });
  }

  async setAccessToken(token: string): Promise<void> {
    this._accessToken = token;
    await this.persist({ access: token });
  }

  private async persist(params: { access?: string; refresh?: string }): Promise<void> {
    try {
      const writes: Promise<void>[] = [];
      if (params.access !== undefined) writes.push(storageSet(ACCESS_KEY, params.access));
      if (params.refresh !== undefined) writes.push(storageSet(REFRESH_KEY, params.refresh));
      await Promise.all(writes);
    } catch {
      // Persistence failed; tokens still live in memory for this session.
    }
  }

  async clear(): Promise<void> {
    this._accessToken = null;
    this._refreshToken = null;
    try {
      await Promise.all([storageDelete(ACCESS_KEY), storageDelete(REFRESH_KEY)]);
    } catch {
      // Memory state already cleared above; persisted state may linger.
    }
  }
}

export const tokenService = new TokenServiceImpl();
