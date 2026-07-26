import { AppButton, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

/**
 * Chat error state — a calm, non-alarming failure card with a context-aware
 * icon (offline vs. generic) and a retry. Mirrors
 * mobile/lib/features/chat/screen/parts/chat_error_state.dart.
 */
export function ChatErrorState({ message, isNetwork, onRetry }: { message: string; isNetwork?: boolean; onRetry: () => void }) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);

  const opacity = enter;
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, opacity, transform: [{ scale }] }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#3D3A6E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <AppIcon name={isNetwork ? 'wifiOff' : 'error'} size={38} color={colors.primary} />
      </View>
      <View style={{ height: 20 }} />
      <AppText variant="medium" weight="700" color={colors.textJet} align="center">
        {isNetwork ? 'You’re offline' : 'Couldn’t load chats'}
      </AppText>
      <View style={{ height: 8 }} />
      <AppText variant="body" color={colors.textMuted} align="center">
        {message}
      </AppText>
      <View style={{ height: 24 }} />
      <AppButton label="Try again" radius={100} onPress={onRetry} startIcon={<AppIcon name="refresh" size={18} color={colors.textWhite} />} />
    </Animated.View>
  );
}
