import { formatSecondsAsDuration } from '@ohlify/core';
import { AppButton, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
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

  const seconds = context.secondsRemaining;
  const isOut = seconds <= 0;
  const isLow = !isOut && seconds <= context.lowSecondsThreshold;
  if (!isOut && !isLow) return null;

  const color = isOut ? colors.error : colors.warning;
  const message = isOut
    ? "You're out of minutes with this professional. Buy minutes to keep chatting."
    : `Only ${formatSecondsAsDuration(seconds)} left — top up to keep chatting and calling.`;

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: `${color}14`,
        borderWidth: 1,
        borderColor: `${color}33`,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${color}1F`, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name={isOut ? 'error' : 'warning'} size={16} color={color} />
      </View>
      <View style={{ width: 10 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyNormal" weight="600" color={color} align="left">
          {message}
        </AppText>
      </View>
      <View style={{ width: 10 }} />
      <AppButton label="Buy minutes" radius={100} height={34} onPress={onBuyMinutes} />
    </View>
  );
}
