import { formatNaira, parseNairaToKobo } from '@ohlify/core';
import type { CallRate, CallType } from '@ohlify/core';
import type { ApiError } from '@ohlify/api';
import { AppLoader, DrawerService, RatesListContent, type RatesController } from '@ohlify/ui';

import {
  useConfigArray,
  useConfigBool,
  useConfigNumber,
} from '../../../../shared/providers/app-config-provider.js';
import { useAddRate } from '../../../profile/api/use-add-rate.js';
import { useDeleteRate } from '../../../profile/api/use-delete-rate.js';
import { useMyRates } from '../../../profile/api/use-my-rates.js';

interface RatesModalContentProps {
  onDone: () => void;
}

const isCallType = (v: unknown): v is CallType => v === 'audio' || v === 'video';
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Modal version of the rates editor — same behaviour as the old
 * `/professional-kyc/rates` route, but rendered inline so the user never
 * leaves the KYC screen. Each add/remove hits the server immediately and
 * invalidates the spec query (handled by the underlying hooks), so the
 * "Rates" tile turns green the moment the first rate lands.
 *
 * Constraints (allowed call types, durations, min/max kobo) come from
 * `rates.*` public config — same source the backend validates against.
 */
export function RatesModalContent({ onDone }: RatesModalContentProps) {
  const { data: rates, isLoading } = useMyRates();
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
  const singleRatePerChannel = useConfigBool('rates.single_rate_per_channel', true);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <AppLoader />
      </div>
    );
  }

  const callRates: CallRate[] = (rates ?? []).map((r) => ({
    id: r.id,
    callType: r.call_type,
    durationMinutes: r.duration_minutes,
    price: formatNaira(r.price_kobo),
    ...(r.price_per_minute_kobo !== null && r.price_per_minute_kobo !== undefined
      ? { pricePerMinute: `${formatNaira(r.price_per_minute_kobo)} / min` }
      : {}),
  }));

  const controller: RatesController = {
    rates: callRates,
    addRate: (incoming) => {
      // RatesListContent gives us a display-formatted price; reverse it to kobo
      // (kobo-precision, handles decimals).
      const parsed = parseNairaToKobo(incoming.price);
      if (parsed === null) {
        DrawerService.toast('Enter a valid price.', { type: 'error' });
        return;
      }
      const priceKobo = Number(parsed);
      addRate.mutate(
        {
          call_type: incoming.callType,
          duration_minutes: incoming.durationMinutes,
          price_kobo: priceKobo,
        },
        {
          onSuccess: () => DrawerService.toast('Rate added successfully', { type: 'success' }),
          onError: (err) => {
            const e = err as unknown as ApiError;
            const message =
              e.fieldErrors?.['price_kobo']?.[0] ??
              e.fieldErrors?.['duration_minutes']?.[0] ??
              e.fieldErrors?.['call_type']?.[0] ??
              (e.reason === 'conflict'
                ? singleRatePerChannel
                  ? 'You already have a rate for this call type. Edit the existing one instead.'
                  : 'A rate already exists for this call type and duration.'
                : 'Could not add rate. Please try again.');
            DrawerService.toast(message, { type: 'error' });
          },
        },
      );
    },
    removeRate: (id: string) => {
      deleteRate.mutate(id, {
        onSuccess: () => DrawerService.toast('Rate deleted successfully', { type: 'success' }),
        onError: () =>
          DrawerService.toast('Could not delete rate. Please try again.', { type: 'error' }),
      });
    },
    constraints: { callTypes, durations, minKobo, maxKobo, singleRatePerChannel },
  };

  return <RatesListContent controller={controller} onDone={onDone} />;
}
