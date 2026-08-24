import { formatNaira, parseNairaToKobo } from '@ohlify/core';
import type { CallType } from '@ohlify/core';
import type { ApiError, KycCallRateValue } from '@ohlify/api';
import { AddRateForm, DrawerService } from '@ohlify/ui';

import {
  useConfigArray,
  useConfigBool,
  useConfigNumber,
} from '../../../../shared/providers/app-config-provider.js';
import { useAddRate } from '../../../profile/api/use-add-rate.js';
import { useEditRate } from '../../../profile/api/use-edit-rate.js';

interface CallRateModalContentProps {
  /** The channel this modal prices. Comes from the tile's key, so the form
   * never asks the user to pick it again. */
  callType: CallType;
  /** The rate already on file for this channel, if any — drives prefill and
   * the POST-vs-PATCH decision. */
  existing: KycCallRateValue | null;
  onDone: () => void;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Single-channel rate editor for the `audio_rate` / `video_rate` KYC items.
 *
 * Replaces the list-modal -> "Add rate" -> pick-call-type stack for these
 * items: the tile names the channel, so this asks only for duration and price.
 * An existing rate is edited in place (PATCH) rather than deleted and
 * recreated — a delete would trip `revaluateKycStatus` and could demote an
 * approved professional mid-edit.
 */
export function CallRateModalContent({ callType, existing, onDone }: CallRateModalContentProps) {
  const addRate = useAddRate();
  const editRate = useEditRate();

  const durations = useConfigArray<number>(
    'rates.allowed_durations_minutes',
    [10, 25, 45, 60],
    isFiniteNumber,
  );
  const minKobo = useConfigNumber('rates.min_kobo', 50_000);
  const maxKobo = useConfigNumber('rates.max_kobo', 50_000_000);
  const singleRatePerChannel = useConfigBool('rates.single_rate_per_channel', true);

  const label = callType === 'audio' ? 'audio' : 'video';

  const onError = (err: unknown, fallback: string) => {
    const e = err as unknown as ApiError;
    const message =
      e.fieldErrors?.['price_kobo']?.[0] ??
      e.fieldErrors?.['duration_minutes']?.[0] ??
      (e.reason === 'conflict'
        ? `You already have a ${label} rate. Edit the existing one instead.`
        : fallback);
    DrawerService.toast(message, { type: 'error' });
  };

  return (
    <AddRateForm
      description={`Set what you charge for a ${label} call. Clients see this on your profile.`}
      submitLabel={existing === null ? 'Save rate' : 'Update rate'}
      fixedCallType={callType}
      callTypes={[callType]}
      durations={durations}
      minKobo={minKobo}
      maxKobo={maxKobo}
      singleRatePerChannel={singleRatePerChannel}
      // Re-confirming the per-minute split on every edit is the friction this
      // split removes; the user accepted the model when they first set it.
      skipConfirm={existing !== null}
      {...(existing !== null
        ? {
            initialDurationMinutes: existing.duration_minutes,
            initialPriceKobo: existing.price_kobo,
          }
        : {})}
      onSave={(incoming) => {
        const parsed = parseNairaToKobo(incoming.price);
        if (parsed === null) {
          DrawerService.toast('Enter a valid price.', { type: 'error' });
          return;
        }
        const priceKobo = Number(parsed);

        if (existing !== null) {
          editRate.mutate(
            {
              id: existing.id,
              price_kobo: priceKobo,
              duration_minutes: incoming.durationMinutes,
            },
            {
              onSuccess: () => {
                DrawerService.toast('Rate updated successfully', { type: 'success' });
                onDone();
              },
              onError: (err) => onError(err, 'Could not update rate. Please try again.'),
            },
          );
          return;
        }

        addRate.mutate(
          {
            call_type: callType,
            duration_minutes: incoming.durationMinutes,
            price_kobo: priceKobo,
          },
          {
            onSuccess: () => {
              DrawerService.toast('Rate added successfully', { type: 'success' });
              onDone();
            },
            onError: (err) => onError(err, 'Could not add rate. Please try again.'),
          },
        );
      }}
    />
  );
}

/** Tile summary for a set channel rate — mirrors the mobile string. */
export function callRateSummary(value: KycCallRateValue): string {
  return `${formatNaira(value.price_kobo)} · ${value.duration_minutes} min`;
}
