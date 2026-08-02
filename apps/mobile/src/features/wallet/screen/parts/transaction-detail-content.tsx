import { useQuery } from '@tanstack/react-query';
import { AnimatedBalance, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { queryKeys } from '@shared/api/query-keys';
import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import { walletApi } from '../../api/wallet-api';
import { formatKobo } from '../../types/wallet-models';

const STATUS_TINT: Record<string, string> = {
  completed: colors.success,
  processing: colors.warning,
  pending: colors.warning,
  failed: colors.error,
  reversed: colors.error,
};

/**
 * The sheet body caps its own height. `showCustomModal` only wraps content in
 * a ScrollView for `position: 'fullscreen'`, so a long failure reason would
 * otherwise push the rows off-screen with no way to reach them.
 */
const MAX_BODY_HEIGHT = 460;

export interface TransactionDetailContentProps {
  amountKobo: number;
  createdAt: string;
  withdrawalId?: string;
}

/**
 * What actually happened to one movement of money.
 *
 * The list row can only say "failed" — this is where the *reason* lives, which
 * for a rejected withdrawal is the only thing that tells the professional what
 * to fix. Withdrawals get a real timeline because they are the transactions
 * that sit in limbo; everything else resolves immediately and shows a summary.
 *
 * Lives in a bottom sheet: it is a glance at one row, not a place to navigate
 * to, and the sheet keeps the list visible behind it.
 */
export function TransactionDetailContent({
  amountKobo,
  createdAt,
  withdrawalId,
}: TransactionDetailContentProps) {
  const withdrawal = useQuery({
    queryKey: queryKeys.withdrawal(withdrawalId ?? ''),
    queryFn: () => walletApi.getWithdrawal(withdrawalId ?? ''),
    enabled: withdrawalId !== undefined,
  });

  const data = withdrawal.data;
  const status = data?.status ?? 'completed';

  return (
    <ScrollView
      style={{ maxHeight: MAX_BODY_HEIGHT }}
      contentContainerStyle={{ paddingBottom: 4 }}
      showsVerticalScrollIndicator={false}
    >
      {/* No title here — the sheet chrome already renders it. */}
      <View style={{ alignItems: 'center', paddingBottom: 12 }}>
        <AnimatedBalance
          value={amountKobo}
          format={(v) => formatKobo(v)}
          variant="title"
          weight="800"
          color={colors.textJet}
        />
        <View style={{ height: 8 }} />
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: `${STATUS_TINT[status] ?? colors.textMuted}1A`,
          }}
        >
          <AppText variant="bodySmall" weight="600" color={STATUS_TINT[status] ?? colors.textMuted}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </AppText>
        </View>
      </View>

      {withdrawalId === undefined ? null : withdrawal.isLoading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : withdrawal.isError ? (
        <AppText variant="bodySmall" color={colors.textMuted} align="center">
          {apiErrorMessage(
            withdrawal.error instanceof ApiError ? withdrawal.error : ApiError.network,
          )}
        </AppText>
      ) : data ? (
        <>
          {data.failureReason ? (
            <View
              style={{
                padding: 16,
                borderRadius: 16,
                backgroundColor: `${colors.error}14`,
                borderWidth: 1,
                borderColor: `${colors.error}33`,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="error" size={16} color={colors.error} />
                <View style={{ width: 8 }} />
                <AppText variant="bodySmall" weight="700" color={colors.textJet} align="left">
                  Why this failed
                </AppText>
              </View>
              <View style={{ height: 6 }} />
              <AppText variant="bodySmall" color={colors.textSlate} align="left">
                {data.failureReason}
              </AppText>
            </View>
          ) : null}

          <View style={{ height: 8 }} />
          {data.bankName ? <DetailRow label="Bank" value={data.bankName} /> : null}
          {data.accountNumberMasked ? (
            <DetailRow label="Account" value={data.accountNumberMasked} />
          ) : null}
          <DetailRow label="Requested" value={new Date(data.requestedAt).toLocaleString()} />
          {data.processedAt ? (
            <DetailRow label="Processed" value={new Date(data.processedAt).toLocaleString()} />
          ) : null}
        </>
      ) : null}

      {withdrawalId === undefined ? (
        <DetailRow label="Date" value={new Date(createdAt).toLocaleString()} />
      ) : null}
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <AppText variant="bodySmall" color={colors.textMuted} align="left">
        {label}
      </AppText>
      <View style={{ flex: 1 }} />
      <AppText variant="bodySmall" weight="600" color={colors.textJet} align="right">
        {value}
      </AppText>
    </View>
  );
}
