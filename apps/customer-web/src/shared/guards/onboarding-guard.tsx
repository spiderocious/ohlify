import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';
import { apiClient, EP } from '@ohlify/api';
import type { OnboardingStatusResponse } from '@ohlify/api';
import { ROUTES } from '@ohlify/core';

export function OnboardingGuard() {
  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () =>
      apiClient
        .get(EP.ONBOARDING_STATUS)
        .json<{ data: OnboardingStatusResponse }>()
        .then((r) => r.data),
    staleTime: 60_000,
  });

  if (isLoading) return null;

  if (data?.step === 'role_selection') {
    return <Navigate to={ROUTES.ROLE_SELECTION.absPath} replace />;
  }
  if (data?.step === 'client_kyc') {
    return <Navigate to={ROUTES.CLIENT_KYC.absPath} replace />;
  }
  if (data?.step === 'professional_kyc') {
    return <Navigate to={ROUTES.PROFESSIONAL_KYC.absPath} replace />;
  }
  if (data?.step === 'kyc_rejected') {
    return <Navigate to={ROUTES.KYC_REJECTED.absPath} replace />;
  }

  return <Outlet />;
}
