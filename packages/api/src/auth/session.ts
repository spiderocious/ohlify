import { TOKEN_KEYS, createTokenStorage } from '@ohlify/core';

const storage = createTokenStorage();

export const session = {
  save(tokens: { access_token: string; refresh_token: string }) {
    storage.set(TOKEN_KEYS.ACCESS, tokens.access_token);
    storage.set(TOKEN_KEYS.REFRESH, tokens.refresh_token);
  },
  clear() {
    storage.remove(TOKEN_KEYS.ACCESS);
    storage.remove(TOKEN_KEYS.REFRESH);
  },
  hasTokens() {
    return Boolean(storage.get(TOKEN_KEYS.ACCESS));
  },
  getAccess() { return storage.get(TOKEN_KEYS.ACCESS); },
  getRefresh() { return storage.get(TOKEN_KEYS.REFRESH); },
};
