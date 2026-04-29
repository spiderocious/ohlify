/**
 * Minimal token storage adapter.
 *
 * v1: not used (web is mock-only). Wired in for the API phase. Defaults to
 * `localStorage` so tokens survive a full reload; pass `{ persistent: false }`
 * to scope to the current tab via `sessionStorage`.
 */
export interface TokenStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

interface CreateTokenStorageOptions {
  persistent?: boolean;
  /** Override storage backend (useful for tests + SSR). */
  backend?: Storage;
}

const memoryFallback = new Map<string, string>();

const memoryBackend: Storage = {
  get length() {
    return memoryFallback.size;
  },
  clear: () => memoryFallback.clear(),
  getItem: (key) => memoryFallback.get(key) ?? null,
  key: (index) => Array.from(memoryFallback.keys())[index] ?? null,
  removeItem: (key) => {
    memoryFallback.delete(key);
  },
  setItem: (key, value) => {
    memoryFallback.set(key, value);
  },
};

function pickBackend(persistent: boolean): Storage {
  if (typeof window === 'undefined') return memoryBackend;
  try {
    return persistent ? window.localStorage : window.sessionStorage;
  } catch {
    return memoryBackend;
  }
}

export function createTokenStorage(options: CreateTokenStorageOptions = {}): TokenStorage {
  const backend = options.backend ?? pickBackend(options.persistent ?? true);
  return {
    get: (key) => backend.getItem(key),
    set: (key, value) => backend.setItem(key, value),
    remove: (key) => backend.removeItem(key),
    clear: () => backend.clear(),
  };
}

export const TOKEN_KEYS = {
  ACCESS: 'ohlify.access_token',
  REFRESH: 'ohlify.refresh_token',
  GUEST: 'ohlify.guest_token',
} as const;
