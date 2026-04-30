import { useState } from 'react';

import type { CallRate, CallType } from '@ohlify/core';

import { AppButton } from '../../primitives/app-button/app-button.js';
import {
  AppDropdownInput,
  type DropdownOption,
} from '../../primitives/app-dropdown-input/app-dropdown-input.js';
import { AppText } from '../../primitives/app-text/app-text.js';
import { AppTextInput } from '../../primitives/app-text-input/app-text-input.js';

const CALL_TYPE_OPTIONS: DropdownOption<CallType>[] = [
  { label: 'Audio call', value: 'audio' },
  { label: 'Video call', value: 'video' },
];

const DURATION_OPTIONS: DropdownOption<number>[] = [
  { label: '10 minutes', value: 10 },
  { label: '25 minutes', value: 25 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
];

function formatPrice(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits === '') return '';
  const withCommas = digits.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  return `₦ ${withCommas}`;
}

interface AddRateFormProps {
  onSave: (rate: Omit<CallRate, 'id'> & { id: string }) => void;
  description?: string;
  submitLabel?: string;
}

/** 1:1 with mobile/lib/ui/widgets/add_rate_form/add_rate_form.dart. */
export function AddRateForm({
  onSave,
  description = 'Add your rate and set duration for every call type, so you can get paid for your time.',
  submitLabel = 'Save',
}: AddRateFormProps) {
  const [callType, setCallType] = useState<CallType | undefined>(undefined);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState('');

  const isValid = Boolean(callType && duration && amount.trim());

  return (
    <div className="flex flex-col gap-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        {description}
      </AppText>
      <AppDropdownInput<CallType>
        label="Call type"
        options={CALL_TYPE_OPTIONS}
        value={callType}
        placeholder="Select"
        bordered
        onChange={setCallType}
      />
      <AppDropdownInput<number>
        label="Duration"
        options={DURATION_OPTIONS}
        value={duration}
        placeholder="Select"
        bordered
        onChange={setDuration}
      />
      <AppTextInput
        label="Price"
        value={amount}
        placeholder="Enter amount"
        charSupported="number"
        onChange={setAmount}
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
