import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { AppIcon, AppIconButton, AppText, colors } from '@ohlify/mobile-ui';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { Env } from '@shared/config/env';

import type { RootStackParamList } from '../../../app.navigation';
import { paystackBridge } from '../services/paystack-bridge';
import type { PaystackOutcome, PaystackResult } from '../services/paystack-service';

type RouteType = RouteProp<RootStackParamList, 'PaystackWebView'>;

/** True when `url` matches Env.paystackCallbackUrl by origin + path (query ignored). */
function matchesCallback(url: string): boolean {
  if (!url) return false;
  try {
    const candidate = new URL(url);
    const expected = new URL(Env.paystackCallbackUrl);
    return candidate.protocol === expected.protocol && candidate.host === expected.host && candidate.pathname === expected.pathname;
  } catch {
    return false;
  }
}

function resultFromCallback(url: string, fallbackReference: string): PaystackResult {
  let reference = fallbackReference;
  let outcome: PaystackOutcome = 'success';
  try {
    const qp = new URL(url).searchParams;
    reference = qp.get('reference') ?? qp.get('trxref') ?? fallbackReference;
    const status = qp.get('status')?.toLowerCase();
    if (status === 'cancelled' || status === 'cancel') outcome = 'cancelled';
    else if (status === 'failed' || status === 'failure') outcome = 'failed';
  } catch {
    // fall through with success default
  }
  return { outcome, reference };
}

/**
 * Fullscreen webview route hosting Paystack's hosted checkout. Mirrors
 * mobile/lib/features/wallet/services/paystack_service.dart's
 * _PaystackWebViewPage. Intercepts navigation to Env.paystackCallbackUrl,
 * settles the pending paystackService.launch() promise via paystackBridge,
 * and pops.
 */
export function PaystackWebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { authorizationUrl, reference } = route.params;
  const [loading, setLoading] = useState(true);
  const settled = useRef(false);

  const settle = useCallback(
    (result: PaystackResult) => {
      if (settled.current) return;
      settled.current = true;
      paystackBridge.settle(result);
      navigation.goBack();
    },
    [navigation],
  );

  const handleBack = useCallback(() => {
    settle({ outcome: 'cancelled', reference });
  }, [settle, reference]);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (matchesCallback(navState.url)) {
        settle(resultFromCallback(navState.url, reference));
      }
    },
    [settle, reference],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ position: 'absolute', left: 8 }}>
          <AppIconButton icon={<AppIcon name="close" size={20} color={colors.textJet} />} variant="ghost" onPress={handleBack} />
        </View>
        <AppText variant="body" color={colors.textJet} weight="700" align="center">
          Paystack
        </AppText>
      </View>
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: authorizationUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onError={(e) => {
            const url = e.nativeEvent.url ?? '';
            if (matchesCallback(url)) settle(resultFromCallback(url, reference));
          }}
        />
        {loading ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
