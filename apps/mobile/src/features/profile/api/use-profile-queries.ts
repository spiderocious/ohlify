import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api/query-keys';

import { banksApi } from '@features/me/api/banks-api';
import { bookingBlocksApi } from '@features/me/api/booking-blocks-api';
import { notificationPrefsApi } from '@features/me/api/notification-prefs-api';
import { ratesApi } from '@features/me/api/rates-api';

/**
 * Profile reads, cached so the settings screens open instantly and stay
 * browsable offline. Each is small and rarely changes, so they lean on the
 * generous default `staleTime` rather than setting their own.
 */
export function useMyRates() {
  return useQuery({
    queryKey: queryKeys.meRates(),
    queryFn: () => ratesApi.listMyRates(),
  });
}

export function useMyBankAccount() {
  return useQuery({
    queryKey: queryKeys.meBankAccount(),
    queryFn: () => banksApi.getMyBankAccount(),
  });
}

export function useMyBookingBlocks() {
  return useQuery({
    queryKey: queryKeys.meBookingBlocks(),
    queryFn: () => bookingBlocksApi.list(),
  });
}

export function useMyNotificationPrefs() {
  return useQuery({
    queryKey: queryKeys.meNotificationPrefs(),
    queryFn: () => notificationPrefsApi.get(),
  });
}
