import { AppIcon, colors, duration } from '@ohlify/mobile-ui';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, TextInput, View } from 'react-native';

/**
 * The Chats-tab search field — a soft pill that lights up with a primary ring
 * on focus and grows a clear button while there's a query. Filters the
 * already-loaded conversation list client-side (peer name + last message).
 */
export function ChatSearchBar({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const clearAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Border color can't ride the native driver — this is a tiny, cheap tween.
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: duration.fast,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused, focusAnim]);

  useEffect(() => {
    Animated.timing(clearAnim, {
      toValue: value.length > 0 ? 1 : 0,
      duration: duration.fast,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [value, clearAnim]);

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', colors.primary] });

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor,
        backgroundColor: colors.background,
        paddingHorizontal: 14,
        shadowColor: '#3D3A6E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <AppIcon name="search" size={20} color={focused ? colors.primary : colors.textSlate} />
      <View style={{ width: 8 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search chats"
        placeholderTextColor={colors.textSlate}
        returnKeyType="search"
        autoCorrect={false}
        style={{ flex: 1, fontFamily: 'MonaSans-Regular', fontSize: 15, color: colors.textJet, paddingVertical: 0 }}
      />
      <Animated.View
        style={{ opacity: clearAnim, transform: [{ scale: clearAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}
        pointerEvents={value.length > 0 ? 'auto' : 'none'}
      >
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppIcon name="close" size={14} color={colors.textCharcoal} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
