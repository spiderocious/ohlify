import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../theme/colors';

/**
 * Rounded-rect placeholder with a shimmer sweep — the base primitive every
 * loading skeleton in the app is built from. 1:1 with
 * mobile/lib/ui/widgets/app_skeleton/app_skeleton.dart.
 *
 * Uses a looping opacity pulse rather than a translating gradient sweep —
 * RN has no cheap way to clip+translate a gradient across an arbitrary
 * shape without react-native-linear-gradient/MaskedView, and a pulse reads
 * just as "loading" as a sweep while needing zero extra dependencies.
 */
export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const PULSE_DURATION_MS = 700;
const MIN_OPACITY = 0.4;
const MAX_OPACITY = 0.85;

export function Skeleton({ width = '100%', height = 14, borderRadius = 6, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: PULSE_DURATION_MS, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: PULSE_DURATION_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [MIN_OPACITY, MAX_OPACITY] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
}

/** Row of stacked skeleton lines — the common "text block" shape. */
export function SkeletonLines({
  count = 2,
  lineHeight = 12,
  gap = 8,
  lastLineWidth = '60%',
}: {
  count?: number;
  lineHeight?: number;
  gap?: number;
  lastLineWidth?: DimensionValue;
}) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ marginTop: i > 0 ? gap : 0 }}>
          <Skeleton height={lineHeight} width={i === count - 1 ? lastLineWidth : '100%'} />
        </View>
      ))}
    </View>
  );
}
