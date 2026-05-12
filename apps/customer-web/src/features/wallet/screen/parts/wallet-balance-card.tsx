import { IconWallet } from '@icons';

import { AppButton, AppText } from '@ohlify/ui';

interface WalletBalanceCardProps {
  balance: string;
  onFund: () => void;
  onWithdraw: () => void;
}

/** Mirrors mobile/lib/features/wallet/screen/parts/wallet_balance_card.dart. */
export function WalletBalanceCard({ balance, onFund, onWithdraw }: WalletBalanceCardProps) {
  return (
    <div className="rounded-2xl bg-primary p-5 text-white">
      <div className="flex items-center gap-2 text-white/80">
        <IconWallet size={16} color="#fff" />
        <AppText variant="bodyNormal" align="start" color="#ffffffcc">
          Wallet balance
        </AppText>
      </div>
      <AppText variant="title" weight={800} align="start" color="#fff" className="mt-2">
        {balance}
      </AppText>
      <div className="mt-4 flex gap-3">
        <AppButton
          label="Fund wallet"
          variant="solid"
          radius={100}
          height={44}
          onPressed={onFund}
        />
        <AppButton
          label="Withdraw"
          variant="solid"
          radius={100}
          height={44}
          onPressed={onWithdraw}
        />
      </div>
    </div>
  );
}
