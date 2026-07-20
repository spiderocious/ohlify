import {
  AddRateForm,
  AppButton,
  AppIcon,
  AppText,
  colors,
  RatesGroup,
  showConfirmationModal,
  showCustomModal,
  showToast,
  type AddedRate,
  type RatesGroupRate,
} from '@ohlify/mobile-ui';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ratesApi } from '@features/me/api/rates-api';
import type { Rate } from '@features/me/types/me-models';
import { ApiError } from '@shared/types/api-error';

/**
 * Modal-mode rates editor. Hits /me/rates directly — each add/remove
 * updates local state, refetches the spec, and rebuilds the list inline.
 * Mirrors mobile/lib/features/onboarding/screen/parts/rates_modal_content.dart.
 */
function formatKoboAsNaira(kobo: number): string {
  const naira = kobo / 100;
  const formatted = naira % 1 === 0 ? naira.toFixed(0) : naira.toFixed(2);
  return `₦${formatted}`;
}

/** Converts the display-formatted price back to integer kobo. */
function priceToKobo(price: string): number {
  const clean = price.replace(/[^0-9.]/g, '');
  const naira = parseFloat(clean) || 0;
  return Math.round(naira * 100);
}

function toRatesGroupRate(rate: Rate): RatesGroupRate {
  return {
    id: rate.id,
    callType: rate.callType,
    durationMinutes: rate.durationMinutes,
    price: formatKoboAsNaira(rate.priceKobo),
    pricePerMinute: rate.pricePerMinuteKobo !== undefined ? `${formatKoboAsNaira(rate.pricePerMinuteKobo)} / min` : undefined,
  };
}

export interface RatesModalContentProps {
  onDone: () => void;
  /**
   * Called after a rate add/delete so the parent's KYC tile can refresh
   * while this modal is still open. Passed as a prop rather than pulled via
   * useKycSpec() here — this component is rendered by ModalHost, a global
   * portal mounted outside KycSpecProvider's tree (which is scoped locally
   * per KYC route), so calling useKycSpec() directly from modal content
   * throws "must be used within KycSpecProvider".
   */
  onRateChanged?: () => void;
}

export function RatesModalContent({ onDone, onRateChanged }: RatesModalContentProps) {
  const [rates, setRates] = useState<RatesGroupRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await ratesApi.listMyRates();
      setRates(list.map(toRatesGroupRate));
      setLoading(false);
    } catch (error) {
      setLoading(false);
      if (error instanceof ApiError) showToast(error.message, { type: 'error' });
      else throw error;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRate(rate: AddedRate) {
    if (busy) return;
    setBusy(true);
    try {
      const priceKobo = priceToKobo(rate.price);
      await ratesApi.addRate({ callType: rate.callType, durationMinutes: rate.durationMinutes, priceKobo });
      await load();
      // Spec drives the parent KYC tile; refetch so it flips to "complete".
      onRateChanged?.();
      showToast('Rate added successfully', { type: 'success' });
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErr = error.fieldError('price_kobo') ?? error.fieldError('duration_minutes') ?? error.fieldError('call_type');
        showToast(
          fieldErr ?? (error.reason === 'conflict' ? 'A rate already exists for this call type and duration.' : error.message),
          { type: 'error' },
        );
      } else {
        throw error;
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeRate(rate: RatesGroupRate) {
    if (busy) return;
    setBusy(true);
    try {
      await ratesApi.deleteRate(rate.id);
      await load();
      onRateChanged?.();
      showToast('Rate deleted successfully', { type: 'success' });
    } catch (error) {
      if (error instanceof ApiError) showToast(error.message, { type: 'error' });
      else throw error;
    } finally {
      setBusy(false);
    }
  }

  function openAddRateModal() {
    const handle = showCustomModal(
      'Add rate',
      (dismiss) => (
        <AddRateForm
          singleRatePerChannel={false}
          onSave={(rate) => {
            dismiss();
            void addRate(rate);
          }}
        />
      ),
      { position: 'bottom' },
    );
    void handle;
  }

  function confirmDelete(rate: RatesGroupRate) {
    showConfirmationModal('Delete rate?', 'Deleting this rate would mean nobody can see it on your profile.', {
      kind: 'error',
      destructive: true,
      confirmButtonText: 'Confirm and delete',
      cancelButtonText: 'Cancel',
      onConfirm: () => void removeRate(rate),
    });
  }

  if (loading) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const audio = rates.filter((r) => r.callType === 'audio');
  const video = rates.filter((r) => r.callType === 'video');
  const hasRates = rates.length > 0;

  return (
    <View>
      {!hasRates ? (
        <EmptyState onAdd={openAddRateModal} />
      ) : (
        <>
          {audio.length > 0 ? (
            <>
              <RatesGroup callType="audio" rates={audio} onDelete={confirmDelete} />
              <View style={{ height: 16 }} />
            </>
          ) : null}
          {video.length > 0 ? (
            <>
              <RatesGroup callType="video" rates={video} onDelete={confirmDelete} />
              <View style={{ height: 16 }} />
            </>
          ) : null}
          <AppButton
            label="Add rate"
            variant="plain"
            startIcon={<AppIcon name="add" size={18} color={colors.primary} />}
            expanded
            radius={100}
            onPress={openAddRateModal}
          />
        </>
      )}
      <View style={{ height: 16 }} />
      <AppButton label="Done" expanded radius={100} isDisabled={!hasRates} onPress={hasRates ? onDone : undefined} />
    </View>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={{ padding: 20, backgroundColor: colors.surfaceLight, borderRadius: 16, alignItems: 'center' }}>
      <AppText variant="body" color={colors.textJet} weight="600" align="center">
        No rates yet
      </AppText>
      <View style={{ height: 6 }} />
      <AppText variant="bodyNormal" color={colors.textMuted} align="center">
        Add what you charge per call type and duration so clients can book.
      </AppText>
      <View style={{ height: 14 }} />
      <AppButton
        label="Add rate"
        startIcon={<AppIcon name="add" size={18} color={colors.textWhite} />}
        expanded
        radius={100}
        onPress={onAdd}
      />
    </View>
  );
}
