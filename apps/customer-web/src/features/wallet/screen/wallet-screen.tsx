import { formatNaira } from '@ohlify/core';
import { AppLoader, AppText, DrawerService } from '@ohlify/ui';
import type { Transaction, TransactionType, WalletStats } from '@ohlify/core';
import type { WalletTransaction } from '@ohlify/api';
import type { ApiError } from '@ohlify/api';

import { useWallet } from '../api/use-wallet.js';
import { useWalletStats } from '../api/use-wallet-stats.js';
import { useWalletTransactions } from '../api/use-wallet-transactions.js';
import { usePaystackInline } from '../api/use-paystack-inline.js';
import { useWithdraw } from '../api/use-withdraw.js';
import { FundAmountModalContent } from './parts/fund-amount-modal-content.js';
import { TransactionHistoryList } from './parts/transaction-history-list.js';
import { WalletBalanceCard } from './parts/wallet-balance-card.js';
import { WalletStatsRow } from './parts/wallet-stats-row.js';
import { WithdrawModalContent } from './parts/withdraw-modal-content.js';

const TX_TYPE_MAP: Record<WalletTransaction['type'], TransactionType> = {
  wallet_funding: 'walletFunding',
  call_payment: 'paymentAudioCall',
  call_earning: 'paymentAudioCall',
  call_refund: 'paymentAudioCall',
  withdrawal: 'withdrawalToBank',
  withdrawal_completed: 'withdrawalToBank',
  withdrawal_reversed: 'withdrawalToBank',
  admin_credit: 'scheduledAudioCall',
  admin_debit: 'scheduledAudioCall',
  admin_manual: 'scheduledAudioCall',
  promo_credit: 'scheduledAudioCall',
};

function toTransaction(tx: WalletTransaction): Transaction {
  const absFormatted = formatNaira(Math.abs(tx.amount_kobo));
  const amount = tx.amount_kobo >= 0 ? `+${absFormatted}` : `-${absFormatted}`;
  const datetime = new Date(tx.occurred_at).toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    id: tx.id,
    type: TX_TYPE_MAP[tx.type],
    datetime,
    amount,
    status: tx.status === 'reversed' ? 'failed' : tx.status,
  };
}

/** Mirrors mobile/lib/features/wallet/screen/wallet_screen.dart. */
export function WalletScreen() {
  const { data: wallet, isLoading } = useWallet();
  const { data: apiStats } = useWalletStats();
  const { data: txPages } = useWalletTransactions();
  const paystack = usePaystackInline();
  const withdraw = useWithdraw();

  const balance = wallet ? formatNaira(wallet.balance_kobo) : '₦0.00';

  const stats: WalletStats = {
    thisWeek: apiStats ? Math.round(apiStats.this_week_kobo / 100) : 0,
    thisMonth: apiStats ? Math.round(apiStats.this_month_kobo / 100) : 0,
    totalCalls: apiStats?.total_calls ?? 0,
  };

  const allTxPages = txPages?.pages ?? [];
  const transactions: Transaction[] = allTxPages
    .flatMap((p) => p.data)
    .map(toTransaction);

  const openFundWallet = (defaultAmountNaira?: number) => {
    DrawerService.showCustomModal(
      'Fund wallet',
      (dismiss) => (
        <FundAmountModalContent
          defaultAmountNaira={defaultAmountNaira}
          onSubmit={async (kobo) => {
            const result = await paystack.open({ amountKobo: kobo });
            if (result.kind === 'success') {
              DrawerService.showFeedbackModal(
                'Wallet funded',
                `${formatNaira(result.amountKobo)} has been added to your wallet.`,
                { kind: 'success', showCloseButton: false },
              );
            } else if (result.kind === 'pending') {
              DrawerService.toast('Payment received — confirmation in progress.', { type: 'info' });
            } else if (result.kind === 'failed') {
              DrawerService.toast('Payment was not completed. Please try again.', { type: 'error' });
            }
            // 'cancelled' → silent, user closed the popup deliberately.
          }}
          onSuccess={dismiss}
        />
      ),
      { position: 'center' },
    );
  };

  const openWithdraw = () => {
    let submittedKobo: number | undefined;
    let submittedFormatted: string | undefined;

    const handle = DrawerService.showCustomModal(
      'Withdraw funds',
      (dismiss) => (
        <WithdrawModalContent
          onSubmit={(formattedAmount) => {
            const naira = parseFloat(formattedAmount.replace(/[^0-9.]/g, ''));
            submittedKobo = Math.round(naira * 100);
            submittedFormatted = formattedAmount;
            dismiss();
          }}
        />
      ),
      { position: 'center' },
    );

    void handle.onDismissed.then(() => {
      if (submittedKobo === undefined || submittedFormatted === undefined) return;
      withdraw.mutate(
        { amount_kobo: submittedKobo },
        {
          onSuccess: () => {
            DrawerService.showFeedbackModal(
              'Withdrawal Request Submitted',
              `You have successfully submitted a withdrawal request for the amount of ${submittedFormatted}.`,
              { kind: 'success', showCloseButton: false },
            );
          },
          onError: (err) => {
            const e = (err as unknown) as ApiError;
            if (e.code === 'no_bank_account') {
              DrawerService.toast('No bank account on file. Please add one in your profile.', {
                type: 'error',
              });
            } else if (e.code === 'insufficient_balance') {
              DrawerService.toast('Insufficient balance for this withdrawal.', { type: 'error' });
            } else if (e.code === 'value_out_of_range') {
              DrawerService.toast('Amount is out of the allowed range.', { type: 'error' });
            } else {
              DrawerService.toast('Withdrawal failed. Please try again.', { type: 'error' });
            }
          },
        },
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-surface-light">
        <AppLoader />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-surface-light">
      <div className="mx-auto w-full max-w-3xl px-5 pb-8 pt-3 lg:max-w-5xl">
        <AppText variant="title" weight={800} align="start" color="var(--ohl-text-jet)">
          Wallet
        </AppText>
        <div className="mt-5">
          <WalletBalanceCard
            balance={balance}
            onFund={() => openFundWallet()}
            onWithdraw={openWithdraw}
          />
        </div>
        <div className="mt-4">
          <WalletStatsRow stats={stats} />
        </div>
        <div className="mt-6">
          <TransactionHistoryList transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
