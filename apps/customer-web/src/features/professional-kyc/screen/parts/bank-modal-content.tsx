import { useEffect, useState } from 'react';

import {
  AppButton,
  AppDropdownInput,
  AppText,
  AppTextInput,
  type DropdownOption,
} from '@ohlify/ui';
import type { ApiError, KycBankValue } from '@ohlify/api';

import { useBanks } from '../../../profile/api/use-banks.js';
import { useResolveBankAccount } from '../../../profile/api/use-resolve-bank-account.js';
import { useSaveBankAccount } from '../../../profile/api/use-save-bank-account.js';

interface BankModalContentProps {
  initial?: KycBankValue | null;
  onSuccess?: () => void;
}

/**
 * Self-contained bank account modal. Fetches the bank list from the API,
 * runs Paystack resolve as the user types, and submits via PUT /me/bank-account
 * which performs server-side fuzzy name matching.
 */
export function BankModalContent({ initial, onSuccess }: BankModalContentProps) {
  const { data: banks } = useBanks();
  const saveBank = useSaveBankAccount();

  const [bankCode, setBankCode] = useState<string | undefined>(initial?.bank_code);
  const [accountNumber, setAccountNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bankOptions: DropdownOption<string>[] = (banks ?? []).map((b) => ({
    label: b.name,
    value: b.code,
  }));

  // Auto-resolve once both fields are valid. The hook's `enabled` guard kicks
  // in at length 8+ but Nigerian bank account numbers are exactly 10.
  const canResolve = accountNumber.length === 10 && bankCode !== undefined;
  const resolve = useResolveBankAccount(canResolve ? accountNumber : '', bankCode ?? '');

  // Clear top-level error when inputs change.
  useEffect(() => {
    if (errorMessage) setErrorMessage(null);
  }, [accountNumber, bankCode]);

  const resolvedName = resolve.data?.account_name ?? null;
  const resolveErr = resolve.error as unknown as ApiError | null;
  const resolveErrCode = resolveErr?.reason;

  const canSubmit = canResolve && resolvedName !== null && !saveBank.isPending;

  const handleSave = () => {
    if (!canSubmit || !bankCode) return;
    saveBank.mutate(
      { account_number: accountNumber, bank_code: bankCode },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: (err) => {
          const e = err as unknown as ApiError;
          if (e.reason === 'account_name_mismatch') {
            setErrorMessage(
              'Account name doesn’t match your full name on file. Use an account in your own name, or update your full name in profile.',
            );
          } else if (e.reason === 'unresolvable_account') {
            setErrorMessage('That account number could not be resolved at the chosen bank.');
          } else {
            setErrorMessage(e.errorMessage || 'Could not save the bank account. Please try again.');
          }
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        We send your payouts to this account. The name on the account must match your full legal
        name.
      </AppText>

      <AppDropdownInput<string>
        label="Bank"
        options={bankOptions}
        value={bankCode}
        placeholder={banks ? 'Select bank' : 'Loading banks…'}
        bordered
        searchable
        onChange={setBankCode}
      />

      <AppTextInput
        label="Account number"
        value={accountNumber}
        placeholder="10-digit NUBAN"
        charSupported="number"
        inputMode="numeric"
        maxLength={10}
        onChange={setAccountNumber}
      />

      {/* Resolve confirmation strip */}
      {canResolve ? (
        resolve.isFetching ? (
          <div className="rounded-md bg-surface px-4 py-3.5">
            <AppText variant="body" align="start" color="var(--ohl-text-slate)">
              Looking up account…
            </AppText>
          </div>
        ) : resolvedName ? (
          <div className="rounded-md bg-secondary/40 px-4 py-3.5">
            <AppText variant="body" align="start" weight={600} color="var(--ohl-text-jet)">
              {resolvedName}
            </AppText>
          </div>
        ) : resolveErrCode === 'unresolvable_account' ? (
          <p className="text-xs text-error">
            That account number could not be resolved at this bank.
          </p>
        ) : resolveErrCode ? (
          <p className="text-xs text-error">Could not look up account. Try again.</p>
        ) : null
      ) : null}

      {errorMessage ? <p className="text-xs text-error">{errorMessage}</p> : null}

      <AppButton
        label={saveBank.isPending ? 'Saving…' : 'Save'}
        expanded
        radius={100}
        isDisabled={!canSubmit}
        isLoading={saveBank.isPending}
        onPressed={handleSave}
      />
    </div>
  );
}
