import {
  AddRateForm,
  AppButton,
  AppIcon,
  AppText,
  EditRateForm,
  RatesGroup,
  colors,
  showConfirmationModal,
  showCustomModal,
  showToast,
  type AddedRate,
  type RatesGroupRate,
} from '@ohlify/mobile-ui';
import type { CallType } from '@ohlify/core';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import { ratesApi } from '@features/me/api/rates-api';
import type { Rate } from '@features/me/types/me-models';
import { useConfigArray, useConfigBool, useConfigNumber } from '@shared/providers/app-config-provider';
import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold';

const isCallType = (v: unknown): v is CallType => v === 'audio' || v === 'video';
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function formatKoboAsNaira(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira % 1 === 0 ? naira.toFixed(0) : naira.toFixed(2)}`;
}

function priceToKobo(price: string): number {
  const clean = price.replace(/[^0-9.]/g, '');
  const naira = Number(clean) || 0;
  return Math.round(naira * 100);
}

function toGroupRate(r: Rate): RatesGroupRate {
  return {
    id: r.id,
    callType: r.callType,
    durationMinutes: r.durationMinutes,
    price: formatKoboAsNaira(r.priceKobo),
    pricePerMinute: r.pricePerMinuteKobo === undefined ? undefined : `${formatKoboAsNaira(r.pricePerMinuteKobo)} / min`,
  };
}

/** Mirrors mobile/lib/features/profile/screen/profile_rates_screen.dart (via RatesListScreen). */
export function ProfileRatesScreen() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);

  const callTypes = useConfigArray<CallType>('rates.allowed_call_types', ['audio', 'video'], isCallType);
  const durations = useConfigArray<number>('rates.allowed_durations_minutes', [10, 25, 45, 60], isFiniteNumber);
  const minKobo = useConfigNumber('rates.min_kobo', 50_000);
  const maxKobo = useConfigNumber('rates.max_kobo', 50_000_000);
  const singleRatePerChannel = useConfigBool('rates.single_rate_per_channel', true);

  const load = useCallback(async () => {
    try {
      const list = await ratesApi.listMyRates();
      setRates(list);
    } catch {
      // Non-fatal — screen shows empty state.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAddRate() {
    const handle = showCustomModal(
      'Add rate',
      (dismiss) => (
        <AddRateModalBody
          singleRatePerChannel={singleRatePerChannel}
          callTypes={callTypes}
          durations={durations}
          minKobo={minKobo}
          maxKobo={maxKobo}
          onSaved={dismiss}
          onSavingChange={(saving) => handle.setDismissible(!saving)}
          load={load}
        />
      ),
      { position: 'bottom' },
    );
  }

  function openEditRate(rate: RatesGroupRate) {
    let pendingPriceKobo: number | undefined;
    let dismiss: () => void = () => undefined;
    const handle = showCustomModal(
      'Edit rate',
      (onDismiss) => {
        dismiss = onDismiss;
        return (
          <EditRateForm
            callType={rate.callType}
            durationMinutes={rate.durationMinutes}
            currentPriceLabel={rate.price}
            onSave={(priceKobo) => {
              pendingPriceKobo = priceKobo;
              dismiss();
            }}
          />
        );
      },
      { position: 'bottom' },
    );
    handle.onDismissed.then(async () => {
      if (pendingPriceKobo === undefined) return;
      try {
        await ratesApi.editRate({ id: rate.id, priceKobo: pendingPriceKobo });
        await load();
        showToast('Rate updated', { type: 'success' });
      } catch (e) {
        const error = e instanceof ApiError ? e : ApiError.network;
        showToast(error.fieldError('price_kobo') ?? apiErrorMessage(error), { type: 'error' });
      }
    });
  }

  async function confirmDelete(rate: RatesGroupRate) {
    let confirmed = false;
    const handle = showConfirmationModal('Delete rate?', 'Deleting rate would mean that no one would be able to see the rate on your profile.', {
      kind: 'error',
      destructive: true,
      confirmButtonText: 'Confirm and delete',
      cancelButtonText: 'Cancel',
      onConfirm: () => {
        confirmed = true;
      },
    });
    await handle.onDismissed;
    if (!confirmed) return;
    try {
      await ratesApi.deleteRate(rate.id);
      await load();
      showToast('Rate deleted successfully', { type: 'success' });
    } catch (e) {
      showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
    }
  }

  const audio = rates.filter((r) => r.callType === 'audio').map(toGroupRate);
  const video = rates.filter((r) => r.callType === 'video').map(toGroupRate);
  const hasRates = rates.length > 0;

  const body = loading ? null : !hasRates ? (
    <View style={{ padding: 24, backgroundColor: colors.surfaceLight, borderRadius: 16, alignItems: 'center' }}>
      <AppIcon name="star" size={28} color={colors.textMuted} />
      <View style={{ height: 10 }} />
      <AppText variant="medium" color={colors.textJet} weight="600" align="center">
        No rates yet
      </AppText>
      <View style={{ height: 4 }} />
      <AppText variant="body" color={colors.textMuted} align="center">
        Add your first rate to let clients book a call with you.
      </AppText>
      <View style={{ height: 16 }} />
      <AppButton label="Add rate" startIcon={<AppIcon name="add" size={18} color={colors.textWhite} />} radius={100} onPress={openAddRate} />
    </View>
  ) : (
    <View>
      {audio.length > 0 ? (
        <>
          <RatesGroup callType="audio" rates={audio} onDelete={confirmDelete} onEdit={openEditRate} />
          <View style={{ height: 20 }} />
        </>
      ) : null}
      {video.length > 0 ? (
        <>
          <RatesGroup callType="video" rates={video} onDelete={confirmDelete} onEdit={openEditRate} />
          <View style={{ height: 20 }} />
        </>
      ) : null}
      <AppButton label="Add rate" variant="plain" startIcon={<AppIcon name="add" size={18} color={colors.primary} />} expanded radius={100} onPress={openAddRate} />
    </View>
  );

  return <ProfileSubscreenScaffold title="Rates" body={body ?? <View />} />;
}

/**
 * Owns save-in-flight/error state so the modal stays open (and locked shut
 * via onSavingChange -> handle.setDismissible) while the request is in
 * flight, and only dismisses on real success — instead of the old
 * dismiss-then-save pattern, which closed the modal immediately regardless
 * of whether the save actually succeeded.
 */
function AddRateModalBody({
  onSaved,
  onSavingChange,
  load,
  ...formProps
}: {
  onSaved: () => void;
  onSavingChange: (saving: boolean) => void;
  load: () => Promise<void>;
  singleRatePerChannel: boolean;
  callTypes: readonly CallType[];
  durations: readonly number[];
  minKobo: number;
  maxKobo: number;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  async function handleSave(rate: AddedRate) {
    setIsSaving(true);
    onSavingChange(true);
    setErrorMessage(undefined);
    try {
      await ratesApi.addRate({ callType: rate.callType, durationMinutes: rate.durationMinutes, priceKobo: priceToKobo(rate.price) });
      await load();
      showToast('Rate added successfully', { type: 'success' });
      onSaved();
    } catch (e) {
      setErrorMessage(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
    } finally {
      setIsSaving(false);
      onSavingChange(false);
    }
  }

  return <AddRateForm {...formProps} isSaving={isSaving} errorMessage={errorMessage} onSave={(rate) => void handleSave(rate)} />;
}
