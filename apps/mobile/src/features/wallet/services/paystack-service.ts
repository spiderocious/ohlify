import { showConfirmationModal } from '@ohlify/mobile-ui';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Linking, Platform } from 'react-native';

import type { RootStackParamList } from '../../../app.navigation';
import { paystackBridge } from './paystack-bridge';

/**
 * Result of a Paystack hosted-checkout session. Mirrors
 * mobile/lib/features/wallet/services/paystack_service.dart. The client
 * never decides "success" — backend `wallet/fund/verify` is the source of
 * truth; this just tells the caller whether to run verify.
 */
export type PaystackOutcome = 'success' | 'cancelled' | 'failed';

export interface PaystackResult {
  outcome: PaystackOutcome;
  reference?: string;
  message?: string;
}

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Opens Paystack's hosted-checkout page. Native: pushes PaystackWebViewScreen
 * (a fullscreen webview route on the root stack) and awaits its result via
 * paystackBridge. Web: react-native-webview has no production web
 * implementation, so we open the authorization URL in a new tab and ask the
 * user to confirm completion, matching the Dart source's `_launchWeb`.
 */
export const paystackService = {
  async launch(
    navigation: RootNavigation,
    params: { authorizationUrl: string; reference: string },
  ): Promise<PaystackResult> {
    if (!params.authorizationUrl) {
      return { outcome: 'failed', message: 'No authorization URL from backend.' };
    }

    if (Platform.OS === 'web') {
      return launchWeb(params.authorizationUrl, params.reference);
    }

    return new Promise((resolve) => {
      paystackBridge.begin(resolve);
      navigation.navigate('PaystackWebView', { authorizationUrl: params.authorizationUrl, reference: params.reference });
    });
  },
};

async function launchWeb(authorizationUrl: string, reference: string): Promise<PaystackResult> {
  try {
    const canOpen = await Linking.canOpenURL(authorizationUrl);
    if (!canOpen) {
      return { outcome: 'failed', reference, message: 'Could not open Paystack.' };
    }
    await Linking.openURL(authorizationUrl);
  } catch (e) {
    return { outcome: 'failed', reference, message: `Could not open Paystack: ${String(e)}` };
  }

  let confirmed = false;
  const handle = showConfirmationModal(
    'Finishing payment',
    'Complete your payment in the new tab, then return here and tap I have paid. We will verify with Paystack and update your wallet.',
    {
      kind: 'info',
      confirmButtonText: 'I have paid',
      cancelButtonText: 'Cancel',
      onConfirm: () => {
        confirmed = true;
      },
    },
  );
  await handle.onDismissed;

  if (!confirmed) return { outcome: 'cancelled', reference };
  return { outcome: 'success', reference };
}
