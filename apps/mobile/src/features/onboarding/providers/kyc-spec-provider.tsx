import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { onboardingApi } from '@features/onboarding/api/onboarding-api';
import { ApiError } from '@shared/types/api-error';

import type { KycItemKey, KycItemSpec, KycSpecResponse } from '../types/kyc-spec';

/**
 * Holds the KYC spec for the current user. Mirrors
 * mobile/lib/features/onboarding/providers/kyc_spec_notifier.dart — every
 * save mutation calls refetch() so the affected tile flips to "complete" the
 * moment the round-trip lands. Scoped to the /professional-kyc and
 * /client-kyc screens (wraps just those, like the Dart version's
 * route-shell scoping) so the spec is fetched once on entry and shared by
 * every modal.
 */
interface KycSpecContextValue {
  spec: KycSpecResponse | null;
  isLoading: boolean;
  error: ApiError | null;
  ensureLoaded: () => void;
  refetch: () => Promise<void>;
  itemFor: (key: KycItemKey) => KycItemSpec | undefined;
}

const KycSpecContext = createContext<KycSpecContextValue | null>(null);

export function KycSpecProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<KycSpecResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onboardingApi.getKycSpec();
      setSpec(result);
    } catch (err) {
      if (err instanceof ApiError) setError(err);
      else throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureLoaded = useCallback(() => {
    if (spec !== null || isLoading) return;
    void refetch();
  }, [spec, isLoading, refetch]);

  const itemFor = useCallback(
    (key: KycItemKey) => spec?.items.find((item) => item.key === key),
    [spec],
  );

  const value: KycSpecContextValue = { spec, isLoading, error, ensureLoaded, refetch, itemFor };

  return <KycSpecContext.Provider value={value}>{children}</KycSpecContext.Provider>;
}

export function useKycSpec(): KycSpecContextValue {
  const ctx = useContext(KycSpecContext);
  if (!ctx) {
    throw new Error('useKycSpec must be used within KycSpecProvider');
  }
  return ctx;
}
