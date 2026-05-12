import { createContext, useContext, type ReactNode } from 'react';
import { usePublicConfig } from '@ohlify/api';
import type { PublicConfig } from '@ohlify/api';

const AppConfigContext = createContext<PublicConfig | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { data } = usePublicConfig();
  return (
    <AppConfigContext.Provider value={data ?? null}>
      {children}
    </AppConfigContext.Provider>
  );
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
 * Read an array value from the public config bag, validating each element
 * against the optional predicate. When the key is missing, malformed, or any
 * element fails the predicate, returns the fallback.
 */
export function useConfigArray<T>(
  key: string,
  fallback: readonly T[],
  isItem?: (v: unknown) => v is T,
): readonly T[] {
  const cfg = useAppConfig();
  const raw = cfg?.values?.[key];
  if (!Array.isArray(raw)) return fallback;
  if (isItem && !raw.every(isItem)) return fallback;
  return raw as T[];
}