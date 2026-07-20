import { AppIcon, AppText, colors, type AppIconName } from '@ohlify/mobile-ui';
import { Fragment } from 'react';
import { View } from 'react-native';

import { transactionIsCredit, transactionIsDebit, transactionTitle, type Transaction, type TransactionStatus, type TransactionType } from '../../types/transaction';

export interface TransactionHistoryListProps {
  transactions: Transaction[];
}

const ICON_BY_TYPE: Record<TransactionType, AppIconName> = {
  withdrawalToBank: 'building',
  paymentAudioCall: 'phone',
  scheduledAudioCall: 'phone',
  paymentVideoCall: 'video',
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
};

/** Mirrors mobile/lib/features/wallet/screen/parts/transaction_history_list.dart. */
export function TransactionHistoryList({ transactions }: TransactionHistoryListProps) {
  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Transaction history
      </AppText>
      <View style={{ height: 8 }} />
      {transactions.map((tx, i) => (
        <Fragment key={tx.id}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
          <TransactionRow tx={tx} />
        </Fragment>
      ))}
    </View>
  );
}

function amountColor(tx: Transaction): string {
  if (transactionIsCredit(tx)) return colors.success;
  if (transactionIsDebit(tx)) return colors.danger;
  return colors.textJet;
}

function statusColor(status: TransactionStatus): string {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'failed':
      return colors.danger;
  }
}

function TransactionRow({ tx }: { tx: Transaction }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}>
      <IconBubble icon={ICON_BY_TYPE[tx.type]} />
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textJet} weight="600" align="left">
          {transactionTitle(tx)}
        </AppText>
        <View style={{ height: 2 }} />
        <AppText variant="label" color={colors.textMuted} align="left">
          {tx.datetime}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="body" color={amountColor(tx)} weight="600" align="right">
          {tx.amount}
        </AppText>
        <View style={{ height: 2 }} />
        <AppText variant="label" color={statusColor(tx.status)} align="right">
          {STATUS_LABEL[tx.status]}
        </AppText>
      </View>
    </View>
  );
}

function IconBubble({ icon }: { icon: AppIconName }) {
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
      <AppIcon name={icon} size={20} color={colors.primary} />
    </View>
  );
}
