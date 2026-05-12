import { useMemo } from 'react';

import type { CallRate, CallType } from '@ohlify/core';
import { formatNaira, parseNairaToKobo } from '@ohlify/core';
import type { ApiError } from '@ohlify/api';
import { DrawerService, RatesListScreen, type RatesController } from '@ohlify/ui';

import {
  useConfigArray,
  useConfigNumber,
} from '../../../shared/providers/app-config-provider.js';
import { useMyRates } from '../api/use-my-rates.js';
import { useAddRate } from '../api/use-add-rate.js';
import { useDeleteRate } from '../api/use-delete-rate.js';

import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold.js';

function apiRateToCallRate(r: {
  id: string;
  call_type: 'audio' | 'video';
  duration_minutes: number;
  price_kobo: number;
}): CallRate {
  return {
    id: r.id,
    callType: r.call_type,
    durationMinutes: r.duration_minutes,
    price: formatNaira(r.price_kobo),
  };
}

const isCallType = (v: unknown): v is CallType => v === 'audio' || v === 'video';
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Mirrors mobile/lib/features/profile/screen/profile_rates_screen.dart. */
export function ProfileRatesScreen() {
  const { data: apiRates } = useMyRates();
  const addRate = useAddRate();
  const deleteRate = useDeleteRate();

  const callTypes = useConfigArray<CallType>(
    'rates.allowed_call_types',
    ['audio', 'video'],
    isCallType,
  );
  const durations = useConfigArray<number>(
    'rates.allowed_durations_minutes',
    [10, 25, 45, 60],
    isFiniteNumber,
  );
  const minKobo = useConfigNumber('rates.min_kobo', 50_000);
  const maxKobo = useConfigNumber('rates.max_kobo', 50_000_000);

  const rates: CallRate[] = useMemo(
    () => (apiRates ?? []).map(apiRateToCallRate),
    [apiRates],
  );

  const controller = useMemo<RatesController>(
    () => ({
      rates,
      addRate: (rate) => {
        const priceKobo = parseNairaToKobo(rate.price);
        if (priceKobo === null) return;
        addRate.mutate(
          {
            call_type: rate.callType,
            duration_minutes: rate.durationMinutes,
            price_kobo: Number(priceKobo),
          },
          {
            onSuccess: () =>
              DrawerService.toast('Rate added successfully', { type: 'success' }),
            onError: (err) => {
              const e = err as unknown as ApiError;
              const message =
                e.field_errors?.['price_kobo']?.[0] ??
                e.field_errors?.['duration_minutes']?.[0] ??
                e.field_errors?.['call_type']?.[0] ??
                (e.code === 'conflict'
                  ? 'A rate already exists for this call type and duration.'
                  : 'Could not add rate. Please try again.');
              DrawerService.toast(message, { type: 'error' });
            },
          },
        );
      },
      removeRate: (id) =>
        deleteRate.mutate(id, {
          onSuccess: () =>
            DrawerService.toast('Rate deleted successfully', { type: 'success' }),
          onError: () =>
            DrawerService.toast('Could not delete rate. Please try again.', { type: 'error' }),
        }),
      constraints: { callTypes, durations, minKobo, maxKobo },
    }),
    [rates, addRate, deleteRate, callTypes, durations, minKobo, maxKobo],
  );

  return (
    <ProfileSubscreenScaffold title="Rates">
      <RatesListScreen controller={controller} />
    </ProfileSubscreenScaffold>
  );
}
