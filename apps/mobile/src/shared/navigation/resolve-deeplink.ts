import { decodeDeeplink, DeeplinkTarget } from '@ohlify/core';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Linking } from 'react-native';

import type { RootStackParamList } from '../../app.navigation';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Sends the user wherever a stored deeplink points.
 *
 * Targets are a server-side vocabulary that outlives any app build, so this
 * build may be handed one it has never heard of. `decodeDeeplink` already
 * degrades those to a sensible parent surface; the `default` here is the last
 * line of that same defence. A notification tap always lands somewhere.
 */
export function resolveDeeplink(navigation: RootNavigation, raw: string | undefined): void {
  const link = decodeDeeplink(raw);
  const params = link.params ?? {};

  switch (link.target) {
    case DeeplinkTarget.CHAT_THREAD:
      navigation.navigate('ChatThread', { conversationId: params.conversation_id! });
      return;
    case DeeplinkTarget.CHATS:
      navigation.navigate('Home', { screen: 'ChatsTab' });
      return;
    case DeeplinkTarget.CALLS:
      navigation.navigate('Home', { screen: 'CallsTab' });
      return;
    case DeeplinkTarget.CALL_DETAIL:
      navigation.navigate('Call', { callId: params.call_id! });
      return;
    case DeeplinkTarget.WALLET:
    case DeeplinkTarget.WALLET_TRANSACTION:
    case DeeplinkTarget.WITHDRAWALS:
      navigation.navigate('Home', { screen: 'WalletTab' });
      return;
    case DeeplinkTarget.NOTIFICATIONS:
      navigation.navigate('Notifications');
      return;
    case DeeplinkTarget.PROFESSIONAL:
      navigation.navigate('Professional', { professionalId: params.professional_id! });
      return;
    case DeeplinkTarget.PROFESSIONAL_SEARCH:
      navigation.navigate('Professionals', undefined);
      return;
    // Profile sub-screens live in a nested stack, so these land on the tab and
    // let the user take the last step. Landing them somewhere sensible beats
    // reaching into another navigator's internals.
    case DeeplinkTarget.PROFILE:
    case DeeplinkTarget.KYC:
    case DeeplinkTarget.STRIKES:
    case DeeplinkTarget.PROFILE_RATES:
    case DeeplinkTarget.PROFILE_BANK_ACCOUNT:
    case DeeplinkTarget.SUPPORT:
      navigation.navigate('Home', { screen: 'ProfileTab' });
      return;
    case DeeplinkTarget.EXTERNAL:
      if (params.url) void Linking.openURL(params.url);
      return;
    default:
      navigation.navigate('Home', { screen: 'HomeTab' });
  }
}
