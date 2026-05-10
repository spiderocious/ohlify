import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ROUTES, formatNaira, type CallType } from '@ohlify/core';
import {
  AppLoader,
  AppErrorState,
  DrawerService,
} from '@ohlify/ui';
import type { ApiError, ApiRate } from '@ohlify/api';

import { useProfessional } from '../../professional-details/api/use-professional.js';
import { useProfessionalRates } from '../../professional-details/api/use-professional-rates.js';
import { useWallet } from '../../wallet/api/use-wallet.js';
import { useCreateBooking } from '../api/use-create-booking.js';
import { useAvailability } from '../api/use-availability.js';
import { usePaystackInline } from '../../wallet/api/use-paystack-inline.js';
import { useConfigNumber } from '../../../shared/providers/app-config-provider.js';
import { CompactProfessionalHeader } from './parts/compact-professional-header.js';
import {
  ScheduleCallForm,
  type ScheduleCallFormSubmit,
} from './parts/schedule-call-form.js';
import type { SlotOption } from './parts/slot-chip-picker.js';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextDayYmd(d: Date): string {
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return toYmd(next);
}

function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Returns the first usable message from an `ApiError.field_errors` bag, or
 * null when there isn't one. Picks the first non-empty entry across all
 * fields (in iteration order) — backend validators put the most relevant
 * problem first, and on this form we only have one field worth of errors
 * to surface in a toast.
 */
function firstFieldError(
  fieldErrors: Record<string, string[]> | undefined,
): string | null {
  if (!fieldErrors) return null;
  for (const messages of Object.values(fieldErrors)) {
    const first = messages?.[0];
    if (first) return first;
  }
  return null;
}

/** Mirrors mobile/lib/features/schedule_call/screen/schedule_call_screen.dart. */
export function ScheduleCallScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const rateIdFromUrl = searchParams.get('rate_id') ?? undefined;

  const { data: pro, isLoading, isError } = useProfessional(id);
  const { data: apiRates } = useProfessionalRates(id);
  const { data: wallet } = useWallet();
  const createBooking = useCreateBooking();
  const paystack = usePaystackInline();
  const minFundingKobo = useConfigNumber('wallet.min_funding_kobo', 50_000);

  // Form state lives at the screen level so the availability query can react
  // to it (date + duration drive the slot grid).
  const [date, setDate] = useState<Date | undefined>();
  const [callType, setCallType] = useState<CallType | undefined>();
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>();

  const lockedRate: ApiRate | undefined = useMemo(() => {
    if (!rateIdFromUrl || !apiRates) return undefined;
    return apiRates.find((r) => r.id === rateIdFromUrl);
  }, [rateIdFromUrl, apiRates]);

  // When a rate is locked via URL, sync call_type + duration so the form's
  // active-rate computation matches and so the availability query carries
  // the right duration.
  const effectiveCallType = lockedRate?.call_type ?? callType;
  const effectiveDuration = lockedRate?.duration_minutes ?? durationMinutes;

  const availabilityEnabled = Boolean(date && effectiveDuration);
  const availabilityParams = availabilityEnabled
    ? {
        from: toYmd(date as Date),
        to: nextDayYmd(date as Date),
        duration_minutes: effectiveDuration as number,
        ...(effectiveCallType ? { call_type: effectiveCallType } : {}),
      }
    : {};
  const { data: availability, isFetching: availabilityLoading } = useAvailability(
    availabilityEnabled ? id : '',
    availabilityParams,
  );

  const slots: SlotOption[] = useMemo(() => {
    const day = availability?.days?.[0];
    if (!day) return [];
    return day.slots
      .filter((s) => s.available)
      .map((s) => ({ startAt: s.start_at, label: formatLocalTime(s.start_at) }));
  }, [availability]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <AppLoader />
      </div>
    );
  }

  if (isError || !pro) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <AppErrorState message="Could not load professional." />
      </div>
    );
  }

  const clearLockedRate = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('rate_id');
    setSearchParams(next, { replace: true });
  };

  /**
   * Submits the booking. On insufficient_balance opens Paystack inline,
   * waits for the user to pay, then retries the booking automatically.
   * Preserves the original recovery flow exactly — payment path unchanged.
   */
  const submitBooking = (submission: ScheduleCallFormSubmit, retryAfterFunding = true) => {
    const matchingRate = apiRates?.find((r) => r.id === submission.rateId);
    if (!matchingRate) {
      DrawerService.toast('No rate available for this selection.', { type: 'error' });
      return;
    }

    createBooking.mutate(
      {
        callee_user_id: pro.id,
        rate_id: matchingRate.id,
        start_at: submission.startAtIso,
      },
      {
        onSuccess: () => {
          DrawerService.showFeedbackModal(
            'Call scheduled',
            'We have notified the professional. You will get a confirmation shortly.',
            {
              kind: 'success',
              position: 'fullscreen',
              showCloseButton: false,
              confirmButtonText: 'Done',
              onConfirm: () => navigate(ROUTES.CALLS.absPath, { replace: true }),
            },
          );
        },
        onError: async (err) => {
          const e = err as unknown as ApiError;
          if (e.code === 'insufficient_balance' && retryAfterFunding) {
            const raw = e.field_errors?.['total_paid_kobo']?.[0] ?? '';
            const match = raw.match(/short by (\d+)/);
            const shortByKobo = match ? parseInt(match[1]!, 10) : minFundingKobo;
            const suggestedKobo = Math.max(shortByKobo, minFundingKobo);

            const proceed = await new Promise<boolean>((resolve) => {
              let confirmed = false;
              const handle = DrawerService.showFeedbackModal(
                'Insufficient balance',
                `You need ${formatNaira(shortByKobo)} more to book this call. Top up your wallet now and we'll complete the booking right after.`,
                {
                  kind: 'warning',
                  confirmButtonText: 'Top up wallet',
                  onConfirm: () => {
                    confirmed = true;
                  },
                },
              );
              void handle.onDismissed.then(() => resolve(confirmed));
            });

            if (!proceed) return;

            try {
              const result = await paystack.open({ amountKobo: suggestedKobo });
              if (result.kind === 'success') {
                DrawerService.toast('Wallet funded — completing your booking…', {
                  type: 'success',
                });
                // Retry the booking. retryAfterFunding=false guards against an
                // infinite loop if the second attempt also reports insufficient
                // balance (e.g. fees ate too much of the top-up).
                submitBooking(submission, false);
              } else if (result.kind === 'pending') {
                DrawerService.toast(
                  'Payment received, awaiting confirmation. Please retry shortly.',
                  { type: 'info' },
                );
              } else if (result.kind === 'failed') {
                DrawerService.toast('Payment was not completed. Please try again.', {
                  type: 'error',
                });
              }
              // 'cancelled' → silent.
            } catch {
              DrawerService.toast('Could not start funding. Please try again.', {
                type: 'error',
              });
            }
          } else if (e.code === 'professional_unavailable') {
            DrawerService.toast(
              'This slot is no longer available. Please choose another time.',
              { type: 'error' },
            );
          } else {
            // Prefer backend field_errors when present — they're already
            // user-facing strings (e.g. "Cannot book yourself"). Fall back
            // to the top-level message, then a generic.
            const fieldMsg = firstFieldError(e.field_errors);
            DrawerService.toast(
              fieldMsg ?? e.message ?? 'Could not schedule call. Please try again.',
              { type: 'error' },
            );
          }
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-light">
      <CompactProfessionalHeader
        name={pro.name}
        role={pro.occupation}
        rating={pro.rating}
        imageKey={pro.cover_photo_url ?? pro.avatar_url}
        onBack={() => navigate(-1)}
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <ScheduleCallForm
          rates={apiRates ?? []}
          lockedRate={lockedRate}
          slots={slots}
          slotsLoading={availabilityEnabled && availabilityLoading}
          date={date}
          onDateChange={setDate}
          callType={callType}
          durationMinutes={durationMinutes}
          onCallTypeChange={setCallType}
          onDurationChange={setDurationMinutes}
          onClearLockedRate={clearLockedRate}
          walletBalanceKobo={wallet?.balance_kobo}
          onSubmit={(s) => submitBooking(s)}
          isSubmitting={createBooking.isPending}
        />
      </div>
    </div>
  );
}
