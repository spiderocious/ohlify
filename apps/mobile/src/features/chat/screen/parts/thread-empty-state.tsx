import { AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

/** Shown inside an open thread that has no messages yet — a warm nudge to
 * send the first message, rather than a blank white void. Mirrors
 * mobile/lib/features/chat/screen/parts/thread_empty_state.dart. */
export function ThreadEmptyState({ name }: { name: string }) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);

  const opacity = enter;
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  const firstName = name.split(' ')[0] ?? name;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 30,
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
          <AppIcon name="chat" size={40} color={colors.primary} />
        </View>
        <View style={{ height: 20 }} />
        <AppText variant="medium" weight="700" color={colors.textJet} align="center">
          Say hello to {firstName} 👋
        </AppText>
        <View style={{ height: 8 }} />
        <AppText variant="body" color={colors.textMuted} align="center">
          This is the start of your conversation. Send a message or schedule a call to get going.
        </AppText>
      </Animated.View>
    </View>
  );
}
