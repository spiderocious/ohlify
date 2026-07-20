import { useNavigation } from '@react-navigation/native';
import { AppButton, AppIcon, AppIconButton, AppText, colors, showConfirmationModal, showCustomModal, showToast } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import { banksApi } from '@features/me/api/banks-api';
import type { BankAccount } from '@features/me/types/me-models';
import { BankModalContent } from '@features/onboarding/screen/parts/bank-modal-content';
import type { KycBankValue } from '@features/onboarding/types/kyc-spec';

function toKycBankValue(account?: BankAccount): KycBankValue | undefined {
  if (!account) return undefined;
  return { bankCode: account.bankCode, bankName: account.bankName, accountNumberMasked: account.accountNumberMasked, accountName: account.accountName };
}

/** Mirrors mobile/lib/features/profile/screen/bank_account_screen.dart. */
export function BankAccountScreen() {
  const navigation = useNavigation();
  const [account, setAccount] = useState<BankAccount | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const acc = await banksApi.getMyBankAccount();
      setAccount(acc ?? undefined);
    } catch {
      // Non-fatal — screen shows "no account" state.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openForm() {
    let dismiss: () => void = () => undefined;
    const handle = showCustomModal(
      account ? 'Change bank account' : 'Add bank account',
      (onDismiss) => {
        dismiss = onDismiss;
        return <BankModalContent initial={toKycBankValue(account)} onSuccess={() => dismiss()} />;
      },
      { position: 'center' },
    );
    handle.onDismissed.then(() => load());
  }

  async function confirmDelete() {
    if (!account) return;
    let confirmed = false;
    const handle = showConfirmationModal('Remove bank account?', 'You will need to add a new account before you can withdraw earnings.', {
      kind: 'error',
      destructive: true,
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Keep',
      onConfirm: () => {
        confirmed = true;
      },
    });
    await handle.onDismissed;
    if (!confirmed) return;

    setDeleting(true);
    try {
      await banksApi.deleteBankAccount();
      await load();
      showToast('Bank account removed', { type: 'success' });
    } catch (e) {
      showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeroCard account={account} onClose={() => navigation.goBack()} />
      {loading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        {account ? (
          <>
            <AppButton
              label={deleting ? 'Removing…' : 'Remove account'}
              variant="outline"
              expanded
              radius={100}
              isDisabled={deleting}
              onPress={deleting ? undefined : confirmDelete}
            />
            <View style={{ height: 10 }} />
          </>
        ) : null}
        <AppButton label={account ? 'Change bank account' : 'Add bank account'} expanded radius={100} onPress={openForm} />
      </View>
    </View>
  );
}

function HeroCard({ account, onClose }: { account?: BankAccount; onClose: () => void }) {
  return (
    <View style={{ backgroundColor: colors.primary, paddingTop: 8 }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <AppIconButton icon={<AppIcon name="close" size={20} color={colors.textWhite} />} variant="ghost" backgroundColor="transparent" size={40} onPress={onClose} />
        <View style={{ height: 32 }} />
        <AppText variant="title" color={colors.textWhite} weight="800" align="left">
          {account?.accountNumberMasked ?? 'No account yet'}
        </AppText>
        <View style={{ height: 6 }} />
        <AppText variant="body" color="rgba(255,255,255,0.85)" align="left">
          {account?.accountName ?? (account ? 'Verified account' : 'Add a bank account to get paid')}
        </AppText>
        {account ? (
          <>
            <View style={{ height: 4 }} />
            <AppText variant="body" color="rgba(255,255,255,0.85)" align="left">
              {account.bankName}
            </AppText>
          </>
        ) : null}
        <View style={{ height: 36 }} />
      </View>
    </View>
  );
}
