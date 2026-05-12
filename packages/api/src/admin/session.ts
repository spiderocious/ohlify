import { createTokenStorage } from '@ohlify/core';

import type { AdminUser } from './types.js';

/**
 * Admin tokens live under their own keys so admin-web and customer-web can
 * coexist on the same origin without trampling each other's sessions during
 * dev. The admin user object is cached too so the shell can render the role
 * badge / email without a network round-trip on every reload.
 */
export const ADMIN_TOKEN_KEYS = {
  ACCESS: 'ohlify.admin.access_token',
  REFRESH: 'ohlify.admin.refresh_token',
  USER: 'ohlify.admin.user',
} as const;

const storage = createTokenStorage();

export const adminSession = {
  save(tokens: { access_token: string; refresh_token: string }, admin?: AdminUser) {
    storage.set(ADMIN_TOKEN_KEYS.ACCESS, tokens.access_token);
    storage.set(ADMIN_TOKEN_KEYS.REFRESH, tokens.refresh_token);
    if (admin) storage.set(ADMIN_TOKEN_KEYS.USER, JSON.stringify(admin));
  },
  saveUser(admin: AdminUser) {
    storage.set(ADMIN_TOKEN_KEYS.USER, JSON.stringify(admin));
  },
  clear() {
    storage.remove(ADMIN_TOKEN_KEYS.ACCESS);
    storage.remove(ADMIN_TOKEN_KEYS.REFRESH);
    storage.remove(ADMIN_TOKEN_KEYS.USER);
  },
  hasTokens(): boolean {
    return Boolean(storage.get(ADMIN_TOKEN_KEYS.ACCESS));
  },
  getAccess(): string | null {
    return storage.get(ADMIN_TOKEN_KEYS.ACCESS);
  },
  getRefresh(): string | null {
    return storage.get(ADMIN_TOKEN_KEYS.REFRESH);
  },
  getUser(): AdminUser | null {
    const raw = storage.get(ADMIN_TOKEN_KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  },
};
