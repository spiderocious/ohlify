import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CallType } from '@ohlify/core';
import { AppText, colors, showFeedbackModal, showToast } from '@ohlify/mobile-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import { bookingsApi } from '@features/bookings/api/bookings-api';
import { runFundWalletFlow } from '@features/wallet/providers/fund-wallet-flow';
import { useWallet } from '@features/wallet/api/use-wallet';
import { useMe } from '@features/profile/api/use-me';
import { professionalsApi } from '@features/professionals/api/professionals-api';
import type { ProfessionalDetail, ProfessionalRateView } from '@features/professionals/types/professional-models';
import type { Professional } from '@features/professionals/types/professional';
import { callHistoryQueryKey } from '@features/calls/api/use-call-history';
import { walletQueryKey, walletTransactionsQueryKey } from '@features/wallet/api/use-wallet';
import { idempotencyKey } from '@shared/utils/idempotency';
import { useAvailability } from '../providers/use-availability';
import { ScheduleCallForm, type ScheduleCallFormSubmit } from './parts/schedule-call-form';
import { ScheduleCallHeader } from './parts/schedule-call-header';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'ScheduleCall'>;

function formatSlotLabel(utcIso: string): string {
  const local = new Date(utcIso);
  const h24 = local.getHours();
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const m = String(local.getMinutes()).padStart(2, '0');
  return `${h12}:${m} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

function toProfessional(d: ProfessionalDetail): Professional {
  return { id: d.id, name: d.name, role: d.role, rating: d.rating, reviewCount: d.reviewCount, avatarUrl: d.coverPhotoKey ?? d.avatarKey };
}

function parseShortfallKobo(e: ApiError): number | undefined {
  const candidates = [...(e.fieldErrors.total_paid_kobo ?? []), ...(e.fieldErrors.shortfall_kobo ?? []), ...(e.fieldErrors.amount_kobo ?? [])];
  for (const raw of candidates) {
    const match = /(\d+)/.exec(raw);
    if (match?.[1]) return Number(match[1]);
  }
  return undefined;
}

/**
 * Single-screen booking flow. Dormant — built for parity with the Flutter
 * source but intentionally left unregistered in app.navigation.tsx (no
 * live entry point yet; scheduling is currently reached only via the
 * details/chat "Call" actions). Mirrors mobile/lib/features/schedule_call/
 * screen/schedule_call_screen.dart.
 */
export function ScheduleCallScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteType>();
  const { professionalId } = route.params;
  const queryClient = useQueryClient();

  const [detail, setDetail] = useState<ProfessionalDetail | undefined>(undefined);
  const [detailError, setDetailError] = useState<ApiError | undefined>(undefined);
  const [detailLoading, setDetailLoading] = useState(true);
  const [rates, setRates] = useState<ProfessionalRateView[]>([]);
  const wallet = useWallet();
  const me = useMe();
  const availability = useAvailability(professionalId);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [callType, setCallType] = useState<CallType | undefined>(undefined);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(undefined);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | undefined>(undefined);
  const [lockedRateCleared, setLockedRateCleared] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    professionalsApi
      .getById(professionalId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setDetailError(e instanceof ApiError ? e : ApiError.network);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    professionalsApi
      .getRates(professionalId)
      .then((r) => {
        if (!cancelled) setRates(r);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [professionalId]);

  const lockedRateId: string | undefined = undefined; // no ?rate_id deep-link source yet — param slot reserved for parity.

  const lockedRate = useMemo(() => {
    if (lockedRateCleared || !lockedRateId) return undefined;
    return rates.find((r) => r.id === lockedRateId);
  }, [lockedRateCleared, lockedRateId, rates]);

  const refreshAvailability = useCallback(
    (nextDate: Date | undefined, nextCallType: CallType | undefined, nextDuration: number | undefined) => {
      const effectiveCallType = lockedRate ? lockedRate.callType : nextCallType;
      const effectiveDuration = lockedRate ? lockedRate.durationMinutes : nextDuration;
      availability.update({ date: nextDate, callType: effectiveCallType, durationMinutes: effectiveDuration });
    },
    [lockedRate, availability],
  );

  // Sync call type + duration once rates land, if a rate is locked. Reads
  // date/callType/durationMinutes via refs so only lockedRate's identity
  // (not those values changing) retriggers this sync.
  const dateRef = useRef(date);
  dateRef.current = date;
  const callTypeRef = useRef(callType);
  callTypeRef.current = callType;
  const durationMinutesRef = useRef(durationMinutes);
  durationMinutesRef.current = durationMinutes;

  useEffect(() => {
    if (!lockedRate) return;
    const lockedCallType: CallType = lockedRate.callType === 'video' ? 'video' : 'audio';
    if (callTypeRef.current === lockedCallType && durationMinutesRef.current === lockedRate.durationMinutes) return;
    setCallType(lockedCallType);
    setDurationMinutes(lockedRate.durationMinutes);
    refreshAvailability(dateRef.current, lockedCallType, lockedRate.durationMinutes);
  }, [lockedRate, refreshAvailability]);

  const slotOptions = useMemo(
    () => availability.availableSlots.map((s) => ({ startAtIso: s.startAt, label: formatSlotLabel(s.startAt) })),
    [availability.availableSlots],
  );

  async function submitBooking(rateId: string, startAt: Date, retryAfterFunding: boolean) {
    try {
      await bookingsApi.create({ calleeUserId: professionalId, rateId, startAt: startAt.toISOString(), idempotencyKey: idempotencyKey() });
      queryClient.invalidateQueries({ queryKey: callHistoryQueryKey() });
      queryClient.invalidateQueries({ queryKey: walletQueryKey() });
      queryClient.invalidateQueries({ queryKey: walletTransactionsQueryKey() });
      showFeedbackModal('Call scheduled', 'We have notified the professional. You will get a confirmation shortly.', {
        kind: 'success',
        position: 'fullscreen',
        showCloseButton: false,
        confirmButtonText: 'Done',
        onConfirm: () => {
          navigation.navigate('Home', { screen: 'CallsTab' });
        },
      });
    } catch (e) {
      const error = e instanceof ApiError ? e : ApiError.network;
      if (error.reason === 'insufficient_balance' && retryAfterFunding) {
        await runInsufficientBalanceRecovery(rateId, startAt, error);
        return;
      }
      showToast(
        error.reason === 'professional_unavailable'
          ? 'That slot was just taken. Pick another time.'
          : error.reason === 'rate_not_found'
            ? 'That rate is no longer available. Refresh and try again.'
            : apiErrorMessage(error),
        { type: 'error' },
      );
      if (error.reason === 'professional_unavailable') {
        setSelectedSlotIso(undefined);
        refreshAvailability(date, callType, durationMinutes);
      }
      if (error.reason === 'rate_not_found') {
        professionalsApi.getRates(professionalId).then(setRates).catch(() => undefined);
      }
    }
  }

  async function runInsufficientBalanceRecovery(rateId: string, startAt: Date, e: ApiError) {
    const shortfallKobo = parseShortfallKobo(e) ?? 100_000;
    let confirmed = false;
    const handle = showFeedbackModal(
      'Insufficient balance',
      `You need ${formatNairaKobo(shortfallKobo)} more to book this call. Top up your wallet now and we'll complete the booking right after.`,
      { kind: 'warning', confirmButtonText: 'Top up wallet', onConfirm: () => (confirmed = true) },
    );
    await handle.onDismissed;
    if (!confirmed) return;

    const result = await runFundWalletFlow({ navigation, queryClient, email: me.data?.email, amountKobo: shortfallKobo });
    if (result.outcome !== 'success') {
      showToast(result.outcome === 'cancelled' ? 'Funding cancelled. Booking not completed.' : (result.message ?? 'Funding failed.'), { type: 'error' });
      return;
    }
    showToast('Wallet funded — completing your booking…', { type: 'success' });
    await wallet.refetch();
    await submitBooking(rateId, startAt, false);
  }

  function onSubmit(submission: ScheduleCallFormSubmit) {
    const startAt = new Date(submission.startAtIso);
    if (Number.isNaN(startAt.getTime())) {
      showToast('Could not read selected time. Pick another slot.', { type: 'error' });
      return;
    }
    submitBooking(submission.rateId, startAt, true);
  }

  if (detailLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (detailError && !detail) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight, padding: 24 }}>
        <AppText variant="body" color={colors.textMuted} align="center">
          {apiErrorMessage(detailError)}
        </AppText>
      </View>
    );
  }

  if (!detail) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <ScrollView>
        <ScheduleCallHeader professional={toProfessional(detail)} onBack={() => navigation.goBack()} />
        <View style={{ height: 12 }} />
        <View style={{ paddingHorizontal: 16 }}>
          <ScheduleCallForm
            rates={rates}
            lockedRate={lockedRate}
            slots={slotOptions}
            slotsLoading={availability.isLoading}
            date={date}
            onDateChange={(d) => {
              setDate(d);
              setSelectedSlotIso(undefined);
              refreshAvailability(d, callType, durationMinutes);
            }}
            callType={callType}
            durationMinutes={durationMinutes}
            onCallTypeChange={(v) => {
              setCallType(v);
              setDurationMinutes(undefined);
              setSelectedSlotIso(undefined);
              refreshAvailability(date, v, undefined);
            }}
            onDurationChange={(v) => {
              setDurationMinutes(v);
              setSelectedSlotIso(undefined);
              refreshAvailability(date, callType, v);
            }}
            selectedSlotIso={selectedSlotIso}
            onSelectedSlotChange={(s) => setSelectedSlotIso(s.startAtIso)}
            onClearLockedRate={
              !lockedRateId
                ? undefined
                : () => {
                    setLockedRateCleared(true);
                    setSelectedSlotIso(undefined);
                    refreshAvailability(date, callType, durationMinutes);
                  }
            }
            walletBalanceKobo={wallet.data?.balanceKobo}
            onSubmit={onSubmit}
            isSubmitting={false}
          />
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function formatNairaKobo(kobo: number): string {
  const naira = kobo / 100;
  const whole = Math.trunc(naira);
  const wholeStr = Math.abs(whole).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  return `₦${wholeStr}`;
}
