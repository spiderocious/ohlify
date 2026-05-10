import type { BankDetails } from '@ohlify/core';
import { BankAccountForm, DrawerService } from '@ohlify/ui';

import { useBankAccount } from '../api/use-bank-account.js';
import { useSaveBankAccount } from '../api/use-save-bank-account.js';
import { useBanks } from '../api/use-banks.js';

import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold.js';

/** Mirrors mobile/lib/features/profile/screen/bank_account_screen.dart. */
export function BankAccountScreen() {
  const { data: bankAccount } = useBankAccount();
  const { data: banks } = useBanks();
  const saveBankAccount = useSaveBankAccount();

  const initial: BankDetails | undefined = bankAccount
    ? {
        accountNumber: bankAccount.account_number_masked,
        bankName: bankAccount.bank_name,
        accountName: bankAccount.account_name,
      }
    : undefined;

  const handleSave = (details: BankDetails) => {
    const matched = banks?.find(
      (b) => b.name.toLowerCase() === details.bankName.toLowerCase(),
    );
    const bankCode = matched?.code ?? details.bankName;
    saveBankAccount.mutate(
      { account_number: details.accountNumber, bank_code: bankCode },
      {
        onSuccess: () => DrawerService.toast('Bank account updated', { type: 'success' }),
        onError: () => DrawerService.toast('Failed to save bank account', { type: 'error' }),
      },
    );
  };

  return (
    <ProfileSubscreenScaffold title="Bank account">
      <div className="rounded-2xl bg-background p-4">
        <BankAccountForm initial={initial} onSave={handleSave} />
      </div>
    </ProfileSubscreenScaffold>
  );
}
