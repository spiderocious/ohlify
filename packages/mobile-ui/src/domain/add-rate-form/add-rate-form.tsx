import type { CallType } from '@ohlify/core';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { showConfirmationModal } from '../../modals/show-confirmation-modal';
import { AppButton } from '../../primitives/app-button/app-button';
import {
  AppDropdownInput,
  type DropdownOption,
} from '../../primitives/app-dropdown-input/app-dropdown-input';
import { AppText } from '../../primitives/app-text/app-text';
import { AppTextInput } from '../../primitives/app-text-input/app-text-input';
import { colors } from '../../theme/colors';

/** 1:1 with mobile/lib/ui/widgets/add_rate_form/add_rate_form.dart. */
export interface AddedRate {
  callType: CallType;
  durationMinutes: number;
  /** Naira-formatted display price, e.g. "₦5,000" — preserves kobo precision for the caller to re-parse. */
  price: string;
}

const DEFAULT_CALL_TYPES: readonly CallType[] = ['audio', 'video'];
const DEFAULT_DURATIONS: readonly number[] = [10, 25, 45, 60];
const DEFAULT_MIN_KOBO = 50_000;
const DEFAULT_MAX_KOBO = 50_000_000;

const CALL_TYPE_LABELS: Record<CallType, string> = {
  audio: 'Audio call',
  video: 'Video call',
};

export interface AddRateFormProps {
  onSave: (rate: AddedRate) => void;
  description?: string;
  submitLabel?: string;
  /**
   * Single-rate model (calls revamp): show the derived per-minute price and
   * a confirmation modal on submit. Sourced from `rates.single_rate_per_channel`
   * public config — defaults to true (the calls-revamp default), matching
   * the Dart source's ConfigNotifier.singleRatePerChannel fallback.
   */
  singleRatePerChannel?: boolean;
  /** Call types the user is allowed to pick. Sourced from `rates.allowed_call_types`. */
  callTypes?: readonly CallType[];
  /** Durations (minutes). Sourced from `rates.allowed_durations_minutes`. */
  durations?: readonly number[];
  /** Inclusive minimum price in kobo. Sourced from `rates.min_kobo`. */
  minKobo?: number;
  /** Inclusive maximum price in kobo. Sourced from `rates.max_kobo`. */
  maxKobo?: number;
  /** True while the caller's save is in flight — disables inputs, shows a spinner on Save. */
  isSaving?: boolean;
  /** Save failure message from the caller, rendered inline above the Save button instead of a toast. */
  errorMessage?: string;
}

function formatKoboAsNaira(kobo: number): string {
  const naira = kobo / 100;
  const formatted = naira % 1 === 0 ? naira.toFixed(0) : naira.toFixed(2);
  return `₦${formatted}`;
}

/** No-decimals short form for the min/max range hint — matches apps/customer-web's AddRateForm. */
function formatNairaShort(kobo: number): string {
  const naira = Math.round(kobo / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

/** Kobo-precision parse: keeps decimals (e.g. "₦5,000.50" -> 500050). */
function priceToKobo(amount: string): number {
  const clean = amount.replace(/[^0-9.]/g, '');
  if (!clean) return 0;
  const naira = parseFloat(clean) || 0;
  return Math.round(naira * 100);
}

/** Floor: per_minute * duration <= price; platform owns the sub-kobo remainder. */
function perMinuteKobo(priceKobo: number, durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return Math.floor(priceKobo / durationMinutes);
}

export function AddRateForm({
  onSave,
  description = 'Add your rate and set duration for every call type, so you can get paid for your time.',
  submitLabel = 'Save',
  singleRatePerChannel = true,
  callTypes = DEFAULT_CALL_TYPES,
  durations = DEFAULT_DURATIONS,
  minKobo = DEFAULT_MIN_KOBO,
  maxKobo = DEFAULT_MAX_KOBO,
  isSaving = false,
  errorMessage,
}: AddRateFormProps) {
  const [callType, setCallType] = useState<CallType>();
  const [duration, setDuration] = useState<number>();
  const [amount, setAmount] = useState('');

  const callTypeOptions = useMemo<DropdownOption<CallType>[]>(
    () => callTypes.map((c) => ({ label: CALL_TYPE_LABELS[c], value: c })),
    [callTypes],
  );
  const durationOptions = useMemo<DropdownOption<number>[]>(
    () => durations.map((d) => ({ label: `${d} minutes`, value: d })),
    [durations],
  );

  const priceKobo = priceToKobo(amount);
  const priceEntered = amount.trim().length > 0;
  const priceTooLow = priceEntered && priceKobo < minKobo;
  const priceTooHigh = priceEntered && priceKobo > maxKobo;
  const priceValid = priceEntered && !priceTooLow && !priceTooHigh;

  const isValid = callType !== undefined && duration !== undefined && priceValid;
  const showPerMinute = singleRatePerChannel && priceValid && (duration ?? 0) > 0;

  const priceErrorMessage = priceTooLow
    ? `Minimum is ${formatNairaShort(minKobo)}.`
    : priceTooHigh
      ? `Maximum is ${formatNairaShort(maxKobo)}.`
      : undefined;
  const priceHelper = `Allowed range: ${formatNairaShort(minKobo)} – ${formatNairaShort(maxKobo)}`;

  function emit() {
    if (!callType || !duration) return;
    onSave({ callType, durationMinutes: duration, price: formatKoboAsNaira(priceKobo) });
  }

  function handleSubmit() {
    if (!isValid || isSaving) return;
    if (!singleRatePerChannel) {
      emit();
      return;
    }
    // Single-rate: confirm the floored per-minute the pro will be paid.
    const perMin = perMinuteKobo(priceKobo, duration ?? 0);
    showConfirmationModal(
      'Confirm your rate',
      `You'll be paid ${formatKoboAsNaira(perMin)} per minute (${formatKoboAsNaira(priceKobo)} ÷ ${duration} min). Any fraction below a kobo is on us.`,
      { confirmButtonText: 'Save rate', cancelButtonText: 'Edit', onConfirm: emit },
    );
  }

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        {description}
      </AppText>
      <View style={{ height: 16 }} />
      <AppDropdownInput
        label="Call type"
        options={callTypeOptions}
        value={callType}
        placeholder="Select"
        bordered
        disabled={isSaving}
        onChange={setCallType}
      />
      <View style={{ height: 14 }} />
      <AppDropdownInput
        label="Duration"
        options={durationOptions}
        value={duration}
        placeholder="Select"
        bordered
        disabled={isSaving}
        onChange={setDuration}
      />
      <View style={{ height: 14 }} />
      <AppTextInput
        label={`Price (${priceHelper})`}
        value={amount}
        placeholder="Enter amount"
        keyboardType="decimal-pad"
        disabled={isSaving}
        onChangeText={setAmount}
        errorMessage={priceErrorMessage}
      />
      {showPerMinute ? (
        <>
          <View style={{ height: 6 }} />
          <AppText variant="bodySmall" color={colors.textMuted} align="left">
            {`≈ ${formatKoboAsNaira(perMinuteKobo(priceKobo, duration ?? 0))} / min`}
          </AppText>
        </>
      ) : null}
      {errorMessage ? (
        <>
          <View style={{ height: 10 }} />
          <AppText variant="bodySmall" color={colors.error} align="left">
            {errorMessage}
          </AppText>
        </>
      ) : null}
      <View style={{ height: 20 }} />
      <AppButton
        label={submitLabel}
        expanded
        radius={100}
        isLoading={isSaving}
        isDisabled={!isValid}
        onPress={isValid ? handleSubmit : undefined}
      />
    </View>
  );
}
