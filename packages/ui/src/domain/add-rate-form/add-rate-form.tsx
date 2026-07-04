import { useMemo, useState } from 'react';

import { formatNaira, parseNairaToKobo, type CallRate, type CallType } from '@ohlify/core';

import { DrawerService } from '../../modals/drawer-service.js';
import { AppButton } from '../../primitives/app-button/app-button.js';
import {
  AppDropdownInput,
  type DropdownOption,
} from '../../primitives/app-dropdown-input/app-dropdown-input.js';
import { AppText } from '../../primitives/app-text/app-text.js';
import { AppTextInput } from '../../primitives/app-text-input/app-text-input.js';

const DEFAULT_CALL_TYPES: readonly CallType[] = ['audio', 'video'];
const DEFAULT_DURATIONS: readonly number[] = [10, 25, 45, 60];
const DEFAULT_MIN_KOBO = 50_000;
const DEFAULT_MAX_KOBO = 50_000_000;

// Allows digits, commas, a single decimal point + up to 2 decimals, optional ₦.
const PRICE_INPUT_PATTERN = /^₦?\s?[0-9,]*(\.[0-9]{0,2})?$/;

const CALL_TYPE_LABELS: Record<CallType, string> = {
  audio: 'Audio call',
  video: 'Video call',
};

/** Floor: per_minute * duration <= price; platform owns the sub-kobo remainder. */
function perMinuteKobo(priceKobo: number, durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return Math.floor(priceKobo / durationMinutes);
}

function formatNairaShort(kobo: number): string {
  const naira = Math.round(kobo / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

interface AddRateFormProps {
  onSave: (rate: Omit<CallRate, 'id'> & { id: string }) => void;
  description?: string;
  submitLabel?: string;
  /** Call types the user is allowed to pick. Sourced from `rates.allowed_call_types`. */
  callTypes?: readonly CallType[];
  /** Durations (minutes). Sourced from `rates.allowed_durations_minutes`. */
  durations?: readonly number[];
  /** Inclusive minimum price in kobo. Sourced from `rates.min_kobo`. */
  minKobo?: number;
  /** Inclusive maximum price in kobo. Sourced from `rates.max_kobo`. */
  maxKobo?: number;
  /**
   * Single-rate model (calls revamp): one rate per channel; show the derived
   * per-minute price + a confirmation modal on submit. Sourced from
   * `rates.single_rate_per_channel`. Defaults to the legacy multi-duration flow.
   */
  singleRatePerChannel?: boolean;
}

/** 1:1 with mobile/lib/ui/widgets/add_rate_form/add_rate_form.dart. */
export function AddRateForm({
  onSave,
  description = 'Add your rate and set duration for every call type, so you can get paid for your time.',
  submitLabel = 'Save',
  callTypes = DEFAULT_CALL_TYPES,
  durations = DEFAULT_DURATIONS,
  minKobo = DEFAULT_MIN_KOBO,
  maxKobo = DEFAULT_MAX_KOBO,
  singleRatePerChannel = false,
}: AddRateFormProps) {
  const [callType, setCallType] = useState<CallType | undefined>(undefined);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState('');

  const callTypeOptions = useMemo<DropdownOption<CallType>[]>(
    () => callTypes.map((c) => ({ label: CALL_TYPE_LABELS[c], value: c })),
    [callTypes],
  );

  const durationOptions = useMemo<DropdownOption<number>[]>(
    () => durations.map((d) => ({ label: `${d} minutes`, value: d })),
    [durations],
  );

  // Parse with kobo precision (handles "₦5,000.50" → 500050).
  const priceKobo = useMemo(() => {
    const parsed = parseNairaToKobo(amount);
    return parsed === null ? null : Number(parsed);
  }, [amount]);

  const priceTooLow = priceKobo !== null && priceKobo < minKobo;
  const priceTooHigh = priceKobo !== null && priceKobo > maxKobo;
  const priceValid = priceKobo !== null && !priceTooLow && !priceTooHigh;

  const isValid = Boolean(callType && duration !== undefined && priceValid);

  const priceErrorMessage = priceTooLow
    ? `Minimum is ${formatNairaShort(minKobo)}.`
    : priceTooHigh
      ? `Maximum is ${formatNairaShort(maxKobo)}.`
      : undefined;

  const priceHelper = `Allowed range: ${formatNairaShort(minKobo)} – ${formatNairaShort(maxKobo)}`;

  // Live derived per-minute hint (single-rate model only).
  const perMinuteHint = useMemo(() => {
    if (!singleRatePerChannel || priceKobo === null || duration === undefined) return undefined;
    return `≈ ${formatNaira(perMinuteKobo(priceKobo, duration))} / min`;
  }, [singleRatePerChannel, priceKobo, duration]);

  const emit = () => {
    onSave({
      id: '',
      callType: callType as CallType,
      durationMinutes: duration as number,
      // Pass the kobo-accurate price as a parseable string so callers preserve
      // precision via parseNairaToKobo.
      price: formatNaira(priceKobo as number),
    });
  };

  const handleSubmit = () => {
    if (!isValid) return;
    if (!singleRatePerChannel) {
      emit();
      return;
    }
    // Single-rate: confirm the floored per-minute the pro will be paid.
    const perMin = perMinuteKobo(priceKobo as number, duration as number);
    DrawerService.showConfirmationModal(
      'Confirm your rate',
      `You'll be paid ${formatNaira(perMin)} per minute (${formatNaira(
        priceKobo as number,
      )} ÷ ${duration} min). Any fraction below a kobo is on us.`,
      {
        confirmButtonText: 'Save rate',
        cancelButtonText: 'Edit',
        onConfirm: emit,
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        {description}
      </AppText>
      <AppDropdownInput<CallType>
        label="Call type"
        options={callTypeOptions}
        value={callType}
        placeholder="Select"
        bordered
        onChange={setCallType}
      />
      <AppDropdownInput<number>
        label="Duration"
        options={durationOptions}
        value={duration}
        placeholder="Select"
        bordered
        onChange={setDuration}
      />
      <div className="flex flex-col gap-1">
        <AppTextInput
          label={`Price (${priceHelper})`}
          value={amount}
          placeholder="Enter amount"
          pattern={PRICE_INPUT_PATTERN}
          inputMode="decimal"
          onChange={setAmount}
          errorMessage={priceErrorMessage}
        />
        {perMinuteHint ? (
          <AppText variant="bodySmall" align="start" color="var(--ohl-text-muted)">
            {perMinuteHint}
          </AppText>
        ) : null}
      </div>
      <AppButton
        label={submitLabel}
        expanded
        radius={100}
        isDisabled={!isValid}
        onPressed={!isValid ? undefined : handleSubmit}
      />
    </div>
  );
}
