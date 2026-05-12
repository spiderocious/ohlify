import { useState } from 'react';

import { AppButton, AppText, AppTextInput } from '@ohlify/ui';

interface WithdrawModalContentProps {
  onSubmit: (formattedAmount: string) => void;
}

/** Mirrors mobile/lib/features/wallet/screen/parts/withdraw_modal_content.dart. */
export function WithdrawModalContent({ onSubmit }: WithdrawModalContentProps) {
  const [amount, setAmount] = useState('');

  const isValid = amount.trim() !== '' && !Number.isNaN(Number(amount));

  return (
    <div className="space-y-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        Funds are sent to your saved bank account on file.
      </AppText>
      <AppTextInput
        label="Amount"
        placeholder="0"
        charSupported="number"
        inputMode="numeric"
        value={amount}
        onChange={setAmount}
      />
      <AppButton
        label="Withdraw"
        expanded
        radius={100}
        isDisabled={!isValid}
        onPressed={
          isValid
            ? () => {
                const naira = Number(amount).toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                onSubmit(`₦${naira}`);
              }
            : undefined
        }
      />
    </div>
  );
}
