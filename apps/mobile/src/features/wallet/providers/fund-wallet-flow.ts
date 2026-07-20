import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { QueryClient } from '@tanstack/react-query';

import { Env } from '@shared/config/env';
import { ApiError } from '@shared/types/api-error';

import type { RootStackParamList } from '../../../app.navigation';
import { profileApi } from '@features/profile/api/profile-api';
import { meQueryKey } from '@features/profile/api/use-me';
import { paystackService } from '../services/paystack-service';
import { walletApi } from '../api/wallet-api';
import { walletQueryKey, walletStatsQueryKey, walletTransactionsQueryKey } from '../api/use-wallet';

export type FundOutcome = 'success' | 'pending' | 'failed' | 'cancelled';

export interface FundResult {
  outcome: FundOutcome;
  amountKobo?: number;
  message?: string;
}

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Three-step flow: /wallet/fund/initialize → Paystack hosted page →
 * /wallet/fund/verify. Mirrors mobile/lib/features/wallet/providers/
 * fund_wallet_flow.dart. On success invalidates wallet + transactions
 * caches.
 */
export async function runFundWalletFlow(params: {
  navigation: RootNavigation;
  queryClient: QueryClient;
  email?: string;
  amountKobo: number;
}): Promise<FundResult> {
  const { navigation, queryClient, email, amountKobo } = params;

  if (!email) {
    return { outcome: 'failed', message: 'No email on file. Please complete your profile first.' };
  }

  let init;
  try {
    init = await walletApi.initFund({ amountKobo, callbackUrl: Env.paystackCallbackUrl });
  } catch (e) {
    return { outcome: 'failed', message: e instanceof ApiError ? e.message : 'Something went wrong.' };
  }

  const paystackResult = await paystackService.launch(navigation, {
    authorizationUrl: init.authorizationUrl,
    reference: init.reference,
  });

  if (paystackResult.outcome === 'cancelled') return { outcome: 'cancelled' };
  if (paystackResult.outcome === 'failed') return { outcome: 'failed', message: paystackResult.message };

  try {
    const verify = await walletApi.verifyFund({ reference: init.reference });
    queryClient.invalidateQueries({ queryKey: walletQueryKey() });
    queryClient.invalidateQueries({ queryKey: walletStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: walletTransactionsQueryKey() });
    if (verify.status === 'success') return { outcome: 'success', amountKobo: verify.amountKobo };
    if (verify.status === 'pending') return { outcome: 'pending', amountKobo: verify.amountKobo };
    return { outcome: 'failed' };
  } catch (e) {
    return { outcome: 'failed', message: e instanceof ApiError ? e.message : 'Something went wrong.' };
  }
}

/** Pre-warms /me so its email is available by the time the user taps Fund Wallet. */
export async function prewarmMeEmail(queryClient: QueryClient): Promise<string | undefined> {
  const cached = queryClient.getQueryData<{ email?: string }>(meQueryKey());
  if (cached?.email) return cached.email;
  const me = await queryClient.fetchQuery({ queryKey: meQueryKey(), queryFn: () => profileApi.getMe() });
  return me.email;
}
