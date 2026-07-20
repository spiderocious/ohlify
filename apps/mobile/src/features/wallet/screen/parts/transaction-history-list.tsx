import { AppIcon, AppText, colors, type AppIconName, AppIconNames } from '@ohlify/mobile-ui';
import { Fragment } from 'react';
import { View } from 'react-native';

import {
  formatKobo,
  walletTransactionIsCredit,
  walletTransactionIsSuccess,
  type WalletTransaction,
} from '../../types/wallet-models';

export interface TransactionHistoryListProps {
  transactions: WalletTransaction[];
}

const STATUS_LABEL: Record<'completed' | 'pending' | 'failed', string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
};

const FALLBACK_ICON: AppIconName = 'admin_shield';

// Server ships an icon KEY; render the corresponding AppIcon. If the server
// ships a key the client doesn't know yet, fall back cleanly rather than
// crashing (the vocabulary is meant to be a closed set — see backend
// wallet.vocabulary.ts — but we defend the edge).
function iconFor(t: WalletTransaction): AppIconName {
  return t.icon in AppIconNames ? (t.icon as AppIconName) : FALLBACK_ICON;
}

function statusFor(t: WalletTransaction): 'completed' | 'pending' | 'failed' {
  if (walletTransactionIsSuccess(t)) return 'completed';
  if (t.status === 'pending') return 'pending';
  return 'failed';
}

function amountLabel(t: WalletTransaction): string {
  const pretty = formatKobo(Math.abs(t.amountKobo), 'NGN');
  if (!pretty.startsWith('₦')) return pretty;
  return `${walletTransactionIsCredit(t) ? '+' : '-'}${pretty}`;
}

function amountColor(t: WalletTransaction): string {
  return walletTransactionIsCredit(t) ? colors.success : colors.danger;
}

function statusColor(status: 'completed' | 'pending' | 'failed'): string {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'failed':
      return colors.danger;
  }
}

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

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const status = statusFor(tx);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}>
      <IconBubble icon={iconFor(tx)} />
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textJet} weight="600" align="left">
          {tx.title}
        </AppText>
        <View style={{ height: 2 }} />
        <AppText variant="label" color={colors.textMuted} align="left">
          {new Date(tx.createdAt).toLocaleString()}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="body" color={amountColor(tx)} weight="600" align="right">
          {amountLabel(tx)}
        </AppText>
        <View style={{ height: 2 }} />
        <AppText variant="label" color={statusColor(status)} align="right">
          {STATUS_LABEL[status]}
        </AppText>
      </View>
    </View>
  );
}

function IconBubble({ icon }: { icon: AppIconName }) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppIcon name={icon} size={20} color={colors.primary} />
    </View>
  );
}
