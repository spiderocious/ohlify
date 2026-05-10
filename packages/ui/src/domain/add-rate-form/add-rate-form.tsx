import { useMemo, useState } from 'react';

import type { CallRate, CallType } from '@ohlify/core';

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

const CALL_TYPE_LABELS: Record<CallType, string> = {
  audio: 'Audio call',
  video: 'Video call',
};

function formatPrice(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits === '') return '';
  const withCommas = digits.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  return `₦ ${withCommas}`;
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

  const priceKobo = useMemo(() => {
    const digits = amount.replace(/[^0-9]/g, '');
    if (digits === '') return null;
    const naira = Number(digits);
    if (!Number.isFinite(naira)) return null;
    return naira * 100;
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
      <AppTextInput
        label={`Price (${priceHelper})`}
        value={amount}
        placeholder="Enter amount"
        charSupported="number"
        onChange={setAmount}
        errorMessage={priceErrorMessage}
      />
      <AppButton
        label={submitLabel}
        expanded
        radius={100}
        isDisabled={!isValid}
        onPressed={
          !isValid
            ? undefined
            : () =>
                onSave({
                  id: '',
                  callType: callType as CallType,
                  durationMinutes: duration as number,
                  price: formatPrice(amount),
                })
        }
      />
    </div>
  );
}
