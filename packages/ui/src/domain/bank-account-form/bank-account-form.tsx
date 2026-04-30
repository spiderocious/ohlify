import { Show } from 'meemaw';
import { useState } from 'react';

import type { BankDetails } from '@ohlify/core';

import { AppButton } from '../../primitives/app-button/app-button.js';
import {
  AppDropdownInput,
  type DropdownOption,
} from '../../primitives/app-dropdown-input/app-dropdown-input.js';
import { AppText } from '../../primitives/app-text/app-text.js';
import { AppTextInput } from '../../primitives/app-text-input/app-text-input.js';

const BANKS: DropdownOption<string>[] = [
  { label: 'Moniepoint MFB', value: 'Moniepoint MFB' },
  { label: 'Access Bank', value: 'Access Bank' },
  { label: 'GTBank', value: 'GTBank' },
  { label: 'UBA', value: 'UBA' },
  { label: 'Zenith Bank', value: 'Zenith Bank' },
  { label: 'Kuda MFB', value: 'Kuda MFB' },
  { label: 'Opay', value: 'Opay' },
  { label: 'First Bank', value: 'First Bank' },
];

interface BankAccountFormProps {
  initial?: BankDetails;
  onSave: (details: BankDetails) => void;
  description?: string;
  submitLabel?: string;
  /** When set, displays the resolved account name as a read-only preview. */
  resolvedAccountName?: string;
}

/** 1:1 with mobile/lib/ui/widgets/bank_account_form/bank_account_form.dart. */
export function BankAccountForm({
  initial,
  onSave,
  description = 'Adding your bank account will affect where you receive your payouts.',
  submitLabel = 'Save',
  resolvedAccountName,
}: BankAccountFormProps) {
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? '');
  const [bankName, setBankName] = useState<string | undefined>(initial?.bankName);

  const isValid = accountNumber.length === 10 && Boolean(bankName);

  return (
    <div className="flex flex-col gap-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        {description}
      </AppText>
      <AppTextInput
        label="Account number"
        value={accountNumber}
        placeholder="Enter new account number"
        charSupported="number"
        maxLength={10}
        onChange={setAccountNumber}
      />
      <AppDropdownInput<string>
        label="Bank name"
        options={BANKS}
        value={bankName}
        placeholder="Select bank"
        bordered
        searchable
        onChange={setBankName}
      />
      <Show when={Boolean(resolvedAccountName)}>
        <div className="rounded-md bg-surface px-4 py-3.5">
          <AppText variant="body" align="start" color="var(--ohl-text-slate)">
            {resolvedAccountName}
          </AppText>
        </div>
      </Show>
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
                  accountNumber,
                  bankName: bankName as string,
                  ...(resolvedAccountName !== undefined
                    ? { accountName: resolvedAccountName }
                    : initial?.accountName !== undefined
                      ? { accountName: initial.accountName }
                      : {}),
                })
        }
      />
    </div>
  );
}
