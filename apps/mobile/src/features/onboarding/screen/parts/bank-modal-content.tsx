import { AppButton, AppDropdownInput, AppText, AppTextInput, colors, type DropdownOption } from '@ohlify/mobile-ui';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { banksApi } from '@features/me/api/banks-api';
import type { Bank } from '@features/me/types/me-models';
import type { KycBankValue } from '@features/onboarding/types/kyc-spec';
import { ApiError } from '@shared/types/api-error';

/**
 * Self-contained bank modal. Lists banks, runs Paystack resolve as the user
 * types, then PUT /me/bank-account on save. Mirrors
 * mobile/lib/features/onboarding/screen/parts/bank_modal_content.dart.
 */
const RESOLVE_DEBOUNCE_MS = 250;

export interface BankModalContentProps {
  initial?: KycBankValue;
  onSuccess: () => void;
}

export function BankModalContent({ initial, onSuccess }: BankModalContentProps) {
  const [banks, setBanks] = useState<Bank[]>();
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankCode, setBankCode] = useState<string | undefined>(initial?.bankCode);
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string>();
  const [resolving, setResolving] = useState(false);
  const [resolveErrorCode, setResolveErrorCode] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [topError, setTopError] = useState<string>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resolveSeqRef = useRef(0);

  useEffect(() => {
    void loadBanks();
    return () => clearTimeout(debounceRef.current);
  }, []);

  async function loadBanks() {
    setLoadingBanks(true);
    try {
      const list = await banksApi.listBanks();
      setBanks(list);
    } catch (error) {
      if (error instanceof ApiError) setTopError(error.message);
      else throw error;
    } finally {
      setLoadingBanks(false);
    }
  }

  const canResolve = accountNumber.length === 10 && Boolean(bankCode);
  const canSubmit = canResolve && resolvedName !== undefined && !saving && !resolving;

  function scheduleResolve(nextAccountNumber: string, nextBankCode: string | undefined) {
    clearTimeout(debounceRef.current);
    if (!(nextAccountNumber.length === 10 && nextBankCode)) {
      setResolvedName(undefined);
      setResolveErrorCode(undefined);
      return;
    }
    debounceRef.current = setTimeout(() => void resolve(nextAccountNumber, nextBankCode), RESOLVE_DEBOUNCE_MS);
  }

  async function resolve(nextAccountNumber: string, nextBankCode: string) {
    const seq = ++resolveSeqRef.current;
    setResolving(true);
    setResolvedName(undefined);
    setResolveErrorCode(undefined);
    try {
      const name = await banksApi.resolveAccount({ accountNumber: nextAccountNumber, bankCode: nextBankCode });
      if (seq !== resolveSeqRef.current) return;
      setResolvedName(name);
    } catch (error) {
      if (seq !== resolveSeqRef.current) return;
      if (error instanceof ApiError) setResolveErrorCode(error.reason);
      else throw error;
    } finally {
      if (seq === resolveSeqRef.current) setResolving(false);
    }
  }

  async function save() {
    if (!canSubmit || !bankCode) return;
    setSaving(true);
    setTopError(undefined);
    try {
      await banksApi.saveBankAccount({ accountNumber, bankCode });
      onSuccess();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.reason === 'account_name_mismatch') {
          setTopError("Account name doesn't match your full name on file. Use an account in your own name, or update your full name.");
        } else if (error.reason === 'unresolvable_account') {
          setTopError('That account number could not be resolved at the chosen bank.');
        } else {
          setTopError(error.message);
        }
      } else {
        throw error;
      }
    } finally {
      setSaving(false);
    }
  }

  const bankOptions: DropdownOption<string>[] = (banks ?? []).map((b) => ({ label: b.name, value: b.code }));

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        We send your payouts to this account. The name on the account must match your full legal name.
      </AppText>
      <View style={{ height: 16 }} />
      <AppDropdownInput
        label="Bank"
        options={bankOptions}
        value={bankCode}
        placeholder={loadingBanks ? 'Loading banks…' : 'Select bank'}
        bordered
        searchable
        onChange={(v) => {
          setBankCode(v);
          scheduleResolve(accountNumber, v);
        }}
      />
      <View style={{ height: 14 }} />
      <AppTextInput
        label="Account number"
        value={accountNumber}
        placeholder="10-digit NUBAN"
        keyboardType="numeric"
        maxLength={10}
        onChangeText={(v) => {
          setAccountNumber(v);
          scheduleResolve(v, bankCode);
        }}
      />
      <View style={{ height: 8 }} />
      <ResolveStrip canResolve={canResolve} resolving={resolving} resolvedName={resolvedName} errorCode={resolveErrorCode} />
      {topError ? (
        <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 12, color: colors.error, marginTop: 8 }}>{topError}</Text>
      ) : null}
      <View style={{ height: 20 }} />
      <AppButton label={saving ? 'Saving…' : 'Save'} expanded radius={100} isDisabled={!canSubmit} onPress={canSubmit ? save : undefined} />
    </View>
  );
}

function ResolveStrip({
  canResolve,
  resolving,
  resolvedName,
  errorCode,
}: {
  canResolve: boolean;
  resolving: boolean;
  resolvedName?: string;
  errorCode?: string;
}) {
  if (!canResolve) return null;
  if (resolving) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderRadius: 12 }}>
        <AppText variant="body" color={colors.textSlate} align="left">
          Looking up account…
        </AppText>
      </View>
    );
  }
  if (resolvedName) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: `${colors.success}1F`, borderRadius: 12 }}>
        <AppText variant="body" color={colors.textJet} weight="600" align="left">
          {resolvedName}
        </AppText>
      </View>
    );
  }
  if (errorCode === 'unresolvable_account') {
    return (
      <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 12, color: colors.error }}>
        That account number could not be resolved at this bank.
      </Text>
    );
  }
  if (errorCode) {
    return <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 12, color: colors.error }}>Could not look up account. Try again.</Text>;
  }
  return null;
}
