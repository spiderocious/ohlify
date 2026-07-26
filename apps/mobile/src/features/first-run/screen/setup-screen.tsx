import { AppText, colors } from '@ohlify/mobile-ui';
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface SetupScreenProps {
  /** 0–1, driven by prefetches that actually completed. */
  progress: number;
  label: string;
}

/**
 * Shown once, on a genuine first run, while the tabs are warmed.
 *
 * The bar tracks real completions rather than a timer: a fake animation that
 * finishes before the data does just moves the wait somewhere less honest.
 */
export function SetupScreen({ progress, label }: SetupScreenProps) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [progress, width]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceLight }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <AppText variant="title" weight="800" color={colors.textJet} align="center">
          Setting things up
        </AppText>
        <View style={{ height: 8 }} />
        <AppText variant="bodySmall" color={colors.textMuted} align="center">
          This only takes a few seconds, and only happens once.
        </AppText>

        <View style={{ height: 36 }} />
        <View
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.border,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.primary,
              width: width.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>

        <View style={{ height: 14 }} />
        <AppText variant="bodySmall" color={colors.textSlate} align="center">
          {label}
        </AppText>
      </View>
    </SafeAreaView>
  );
}
