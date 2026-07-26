import { AppButton, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

/**
 * Chat empty state — a soft, animated "start a conversation" illustration
 * built from stacked chat-bubble shapes that breathe gently, plus a clear
 * CTA into discovery. Mirrors
 * mobile/lib/features/chat/screen/parts/chat_empty_state.dart.
 */
export function ChatEmptyState({ onBrowse }: { onBrowse: () => void }) {
  const enter = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [enter, float]);

  const opacity = enter;
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const floatYSlow = float.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

  return (
    <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, opacity, transform: [{ scale }] }}>
      <View style={{ width: 160, height: 140, alignItems: 'center', justifyContent: 'center' }}>
        {/* back bubble */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 8,
            left: 22,
            width: 86,
            height: 60,
            borderRadius: 22,
            borderBottomLeftRadius: 6,
            backgroundColor: colors.secondary,
            transform: [{ translateY: floatYSlow }],
          }}
        />
        {/* front bubble with icon */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 6,
            right: 20,
            width: 104,
            height: 72,
            borderRadius: 26,
            borderBottomRightRadius: 8,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: floatY }],
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <AppIcon name="chat" size={34} color={colors.textWhite} />
        </Animated.View>
      </View>

      <View style={{ height: 28 }} />
      <AppText variant="medium" weight="800" color={colors.textJet} align="center">
        No conversations yet
      </AppText>
      <View style={{ height: 8 }} />
      <AppText variant="body" color={colors.textMuted} align="center">
        Buy minutes with a professional and your chats will show up right here.
      </AppText>
      <View style={{ height: 24 }} />
      <AppButton label="Browse professionals" radius={100} onPress={onBrowse} startIcon={<AppIcon name="search" size={18} color={colors.textWhite} />} />
    </Animated.View>
  );
}
