import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppButton,
  ClientView,
  colors,
  AppText,
  showCustomModal,
  showFeedbackModal,
  showToast,
  TransactionHistorySkeleton,
} from '@ohlify/mobile-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import type { MainTabParamList } from '../../../main-tabs.navigation';
import { useMe } from '@features/profile/api/use-me';
import { prewarmMeEmail, runFundWalletFlow } from '../providers/fund-wallet-flow';
import { useWithdrawMutation, useWallet, useWalletStats, useWalletTransactions } from '../api/use-wallet';
import { FundAmountForm } from './parts/fund-amount-form';
import { TransactionHistoryList } from './parts/transaction-history-list';
import { WalletBalanceCard } from './parts/wallet-balance-card';
import { WalletStatsRow } from './parts/wallet-stats-row';
import { WithdrawModalContent } from './parts/withdraw-modal-content';
import type { WalletTransaction } from '../types/wallet-models';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type WalletRouteProp = RouteProp<MainTabParamList, 'WalletTab'>;

/** Mirrors mobile/lib/features/wallet/screen/wallet_screen.dart. */
export function WalletScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<WalletRouteProp>();
  const queryClient = useQueryClient();
  const wallet = useWallet();
  const stats = useWalletStats();
  const transactions = useWalletTransactions();
  const me = useMe();
  const withdrawMutation = useWithdrawMutation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const consumedOpenFund = useRef(false);

  const balanceKobo = wallet.data?.balanceKobo ?? 0;
  const balanceCurrency = wallet.data?.currency ?? 'NGN';
  const statsData = useMemo(
    () => ({
      thisWeek: stats.data ? Math.round(stats.data.thisWeekKobo / 100) : 0,
      thisMonth: stats.data ? Math.round(stats.data.thisMonthKobo / 100) : 0,
      totalCalls: stats.data?.totalCalls ?? 0,
    }),
    [stats.data],
  );
  const txItems = useMemo<WalletTransaction[]>(
    () => transactions.data?.pages.flatMap((p) => p.items) ?? [],
    [transactions.data],
  );

  async function refreshAll() {
    setIsRefreshing(true);
    try {
      await Promise.all([wallet.refetch(), stats.refetch(), transactions.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function openFund() {
    let amountText: string | undefined;
    let dismiss: () => void = () => undefined;
    const handle = showCustomModal(
      'Fund wallet',
      (onDismiss) => {
        dismiss = onDismiss;
        return (
          <FundAmountForm
            onSubmit={(formatted) => {
              amountText = formatted;
              dismiss();
            }}
          />
        );
      },
      { position: 'center' },
    );
    await handle.onDismissed;
    const raw = amountText;
    if (!raw) return;
    const digits = raw.replace(/[^0-9]/g, '');
    const naira = Number(digits) || 0;
    if (naira <= 0) {
      showToast('Enter a valid amount', { type: 'error' });
      return;
    }

    let email = me.data?.email;
    if (!email) {
      try {
        email = await prewarmMeEmail(queryClient);
      } catch {
        // fund flow below will report the missing-email failure
      }
    }

    const result = await runFundWalletFlow({ navigation, queryClient, email, amountKobo: naira * 100 });
    switch (result.outcome) {
      case 'success':
        showFeedbackModal('Wallet funded', 'Your wallet has been topped up successfully.', { kind: 'success', showCloseButton: false });
        break;
      case 'pending':
        showToast('Payment confirmation in progress. Refresh in a moment.', { type: 'info' });
        break;
      case 'failed':
        showToast(result.message ?? 'Funding failed', { type: 'error' });
        break;
      case 'cancelled':
        break;
    }
  }

  async function openWithdraw() {
    let amountText: string | undefined;
    let dismiss: () => void = () => undefined;
    const handle = showCustomModal(
      'Withdraw funds',
      (onDismiss) => {
        dismiss = onDismiss;
        return (
          <WithdrawModalContent
            onSubmit={(formatted) => {
              amountText = formatted;
              dismiss();
            }}
          />
        );
      },
      { position: 'center' },
    );
    await handle.onDismissed;
    const raw = amountText;
    if (!raw) return;
    const digits = raw.replace(/[^0-9]/g, '');
    const naira = Number(digits) || 0;
    if (naira <= 0) return;
    try {
      await withdrawMutation.mutateAsync(naira * 100);
      showFeedbackModal(
        'Withdrawal Request Submitted',
        `You have successfully submitted a withdrawal request for ₦${digits.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')}.`,
        { kind: 'success', showCloseButton: false },
      );
    } catch (e) {
      const error = e instanceof ApiError ? e : ApiError.network;
      const msg =
        error.reason === 'no_bank_account'
          ? 'Add a bank account before withdrawing earnings.'
          : error.reason === 'insufficient_balance'
            ? 'Withdrawable balance is too low for this amount.'
            : error.reason === 'value_out_of_range'
              ? 'Amount is outside the allowed withdrawal range.'
              : apiErrorMessage(error);
      showToast(msg, { type: 'error' });
    }
  }

  // Auto-opens the Fund wallet modal when arriving via the insufficient-balance
  // redirect from Buy minutes (see professional-details/buy-minutes-section.tsx).
  // consumedOpenFund guards against re-firing on every re-render/refocus once
  // the param has been acted on; clearing the param itself would also work but
  // this avoids an extra navigation.setParams round-trip.
  useEffect(() => {
    if (route.params?.openFund && !consumedOpenFund.current) {
      consumedOpenFund.current = true;
      void openFund();
    }
  }, [route.params?.openFund]);

  const isLoadingBalance = wallet.isLoading && !wallet.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} />}
      >
        <View style={{ height: 12 }} />
        <AppText variant="title" color={colors.textJet} align="left" weight="800">
          Wallet
        </AppText>
        <View style={{ height: 20 }} />
        <WalletBalanceCard balanceKobo={balanceKobo} currency={balanceCurrency} onWithdraw={openWithdraw} />
        <ClientView>
          <View style={{ height: 12 }} />
          <AppButton label="Fund wallet" variant="outline" expanded radius={100} onPress={openFund} />
        </ClientView>
        <View style={{ height: 16 }} />
        <WalletStatsRow stats={statsData} />
        <View style={{ height: 24 }} />
        {isLoadingBalance ? (
          <TransactionHistorySkeleton />
        ) : (
          <TransactionHistoryList transactions={txItems} />
        )}
        {transactions.hasNextPage ? (
          <>
            <View style={{ height: 12 }} />
            <AppButton
              label={transactions.isFetchingNextPage ? 'Loading…' : 'Load more'}
              expanded
              radius={100}
              variant="outline"
              isDisabled={transactions.isFetchingNextPage}
              onPress={transactions.isFetchingNextPage ? undefined : () => transactions.fetchNextPage()}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
