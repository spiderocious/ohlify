import type { ReactNode } from 'react';

interface AppProviderProps {
  children: ReactNode;
}

/**
 * Composes global providers. v1: nothing here. Modal provider, query client,
 * feature flags, etc. land as we wire them.
 */
export function AppProvider({ children }: AppProviderProps) {
  return <>{children}</>;
}
