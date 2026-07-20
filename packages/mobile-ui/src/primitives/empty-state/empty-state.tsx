import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';

import { AppButton } from '../app-button/app-button';
import { AppIcon, type AppIconName } from '../../icons/app-icons';
import { AppText } from '../app-text/app-text';
import { colors } from '../../theme/colors';
import { duration } from '../../theme/motion';

/**
 * Reusable empty-state block: icon slot + title + subtitle + optional CTA,
 * with a gentle fade + scale-up entrance. 1:1 with
 * mobile/lib/ui/widgets/app_empty_state/app_empty_state.dart. Replaces every
 * screen's hand-rolled "No X found" text block.
 */
export interface EmptyStateProps {
  icon?: AppIconName;
  /** Overrides the default icon rendering entirely — for a Lottie/illustration slot later. */
  illustration?: ReactNode;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ icon = 'search', illustration, title, subtitle, ctaLabel, onCtaPress }: EmptyStateProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: duration.base, useNativeDriver: true }).start();
  }, [progress]);

  const opacity = progress;
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  return (
    <Animated.View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48, opacity, transform: [{ scale }] }}>
      {illustration ?? (
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: colors.surfaceDark,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name={icon} size={40} color={colors.textSlate} />
        </View>
      )}
      <View style={{ height: 20 }} />
      <AppText variant="medium" color={colors.textJet} weight="700" align="center">
        {title}
      </AppText>
      {subtitle ? (
        <>
          <View style={{ height: 8 }} />
          <AppText variant="body" color={colors.textMuted} align="center">
            {subtitle}
          </AppText>
        </>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <>
          <View style={{ height: 20 }} />
          <AppButton label={ctaLabel} variant="outline" radius={100} onPress={onCtaPress} />
        </>
      ) : null}
    </Animated.View>
  );
}
