import { IconBuilding, IconPhone, IconVideo, IconWallet } from '@icons';
import { Repeat, Show } from 'meemaw';
import type { ReactNode } from 'react';

import {
  isCredit,
  transactionTitle,
  type Transaction,
  type TransactionType,
} from '@ohlify/core';
import { AppEmptyState, AppText } from '@ohlify/ui';

interface TransactionHistoryListProps {
  transactions: ReadonlyArray<Transaction>;
}

const TYPE_ICON: Record<TransactionType, ReactNode> = {
  withdrawalToBank: <IconBuilding size={18} />,
  paymentAudioCall: <IconPhone size={18} />,
  paymentVideoCall: <IconVideo size={18} />,
  scheduledAudioCall: <IconPhone size={18} />,
  walletFunding: <IconWallet size={18} />,
};

/** Mirrors mobile/lib/features/wallet/screen/parts/transaction_history_list.dart. */
export function TransactionHistoryList({ transactions }: TransactionHistoryListProps) {
  return (
    <div>
      <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
        Transactions
      </AppText>
      <Show
        when={transactions.length > 0}
        fallback={<AppEmptyState message="No transactions yet." />}
      >
        <div className="mt-3 space-y-2">
          <Repeat each={transactions as Transaction[]}>
            {(tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 rounded-2xl bg-background p-3.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-dark text-primary">
                  {TYPE_ICON[tx.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <AppText variant="body" weight={600} align="start" maxLines={1}>
                    {transactionTitle[tx.type]}
                  </AppText>
                  <AppText
                    variant="bodyNormal"
                    align="start"
                    color="var(--ohl-text-muted)"
                    className="mt-0.5"
                  >
                    {tx.datetime}
                  </AppText>
                </div>
                <AppText
                  variant="body"
                  weight={700}
                  align="end"
                  color={isCredit(tx) ? 'var(--ohl-success)' : 'var(--ohl-text-jet)'}
                >
                  {tx.amount}
                </AppText>
              </div>
            )}
          </Repeat>
        </div>
      </Show>
    </div>
  );
}
