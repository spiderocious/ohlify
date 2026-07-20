import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { View } from 'react-native';

import type { ConversationContext } from '../../types/chat-models';

export interface CreditsBannerProps {
  context: ConversationContext;
  onBuyMinutes: () => void;
}

/**
 * Sits above the composer. Warns the paying client when minutes with this
 * pro run low, and blocks messaging at zero (backend enforces the same
 * rule with a 403). Never shown to the professional. Mirrors
 * mobile/lib/features/chat/screen/parts/credits_banner.dart.
 */
export function CreditsBanner({ context, onBuyMinutes }: CreditsBannerProps) {
  if (!context.viewerIsClient) return null;

  const minutes = context.minutesRemaining;
  const isOut = minutes <= 0;
  const isLow = !isOut && minutes <= context.lowMinutesThreshold;
  if (!isOut && !isLow) return null;

  const color = isOut ? colors.error : colors.warning;
  const message = isOut
    ? "You're out of minutes with this professional. Buy minutes to keep chatting."
    : `Only ${minutes} minute${minutes === 1 ? '' : 's'} left — top up to keep chatting and calling.`;

  return (
    <View style={{ backgroundColor: `${color}1A`, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodySmall" color={color} align="left">
          {message}
        </AppText>
      </View>
      <View style={{ width: 8 }} />
      <AppButton label="Buy minutes" radius={100} height={34} onPress={onBuyMinutes} />
    </View>
  );
}
