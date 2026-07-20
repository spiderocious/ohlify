import { createContext, useContext, type ReactNode } from 'react';
import { usePublicConfig } from '@ohlify/api';
import type { PublicConfig } from '@ohlify/api';

/**
 * Mirrors apps/customer-web/src/shared/providers/app-config-provider.tsx —
 * same shape, ported for parity. Backs GET /platform-config/public, whose
 * hook (usePublicConfig) already existed in @ohlify/api but was never wired
 * into apps/mobile until now.
 */
const AppConfigContext = createContext<PublicConfig | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { data } = usePublicConfig();
  return <AppConfigContext.Provider value={data ?? null}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): PublicConfig | null {
  return useContext(AppConfigContext);
}

/**
 * Read a numeric value from the public config bag, falling back when the
 * config hasn't loaded yet or the key is missing.
 */
export function useConfigNumber(key: string, fallback: number): number {
  const cfg = useAppConfig();
  const raw = cfg?.values?.[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/**
 * Read a boolean value from the public config bag, falling back when the
 * config hasn't loaded yet or the key is missing.
 */
export function useConfigBool(key: string, fallback: boolean): boolean {
  const cfg = useAppConfig();
  const raw = cfg?.values?.[key];
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

/**
 * Read an array value from the public config bag, validating each element
 * against the optional predicate. When the key is missing, malformed, or any
 * element fails the predicate, returns the fallback.
 */
export function useConfigArray<T>(key: string, fallback: readonly T[], isItem?: (v: unknown) => v is T): readonly T[] {
  const cfg = useAppConfig();
  const raw = cfg?.values?.[key];
  if (!Array.isArray(raw)) return fallback;
  if (isItem && !raw.every(isItem)) return fallback;
  return raw as T[];
}

/**
 * Read a string value from the public config bag, falling back when the
 * config hasn't loaded yet or the key is missing. Not present in
 * customer-web's provider (added here for support.whatsapp_deeplink).
 */
export function useConfigString(key: string, fallback: string): string {
  const cfg = useAppConfig();
  const raw = cfg?.values?.[key];
  return typeof raw === 'string' && raw.length > 0 ? raw : fallback;
}
