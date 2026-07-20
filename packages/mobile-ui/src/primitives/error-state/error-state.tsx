import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { AppButton } from '../app-button/app-button';
import { AppIcon } from '../../icons/app-icons';
import { AppText } from '../app-text/app-text';
import { colors } from '../../theme/colors';
import { duration } from '../../theme/motion';

/**
 * Reusable error-state block: context-aware icon + message + retry, with
 * the same fade + scale-up entrance as EmptyState. 1:1 with
 * mobile/lib/ui/widgets/app_error_state/app_error_state.dart (Flutter's
 * existing AppErrorState gets the equivalent entrance + network-icon
 * treatment applied directly — see composed_skeletons.dart siblings).
 * Replaces every screen's hand-rolled "centered gray text + Try again".
 *
 * mobile-ui has no dependency on the app's ApiError type (that lives in
 * apps/mobile/src/shared/types/api-error.ts, one layer up) — callers resolve
 * the message and the `isNetwork` flag themselves (e.g. via
 * `apiErrorMessage(error)` and `error.isNetwork`) and pass them in.
 */
export interface ErrorStateProps {
  message?: string;
  isNetwork?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ message = 'Something went wrong.', isNetwork = false, onRetry, retryLabel = 'Try again' }: ErrorStateProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: duration.base, useNativeDriver: true }).start();
  }, [progress]);

  const opacity = progress;
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  return (
    <Animated.View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48, opacity, transform: [{ scale }] }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: '#FEE2E2',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={isNetwork ? 'wifiOff' : 'error'} size={32} color={colors.error} />
      </View>
      <View style={{ height: 16 }} />
      <AppText variant="body" color={colors.textMuted} align="center">
        {message}
      </AppText>
      {onRetry ? (
        <>
          <View style={{ height: 16 }} />
          <AppButton label={retryLabel} radius={100} onPress={onRetry} />
        </>
      ) : null}
    </Animated.View>
  );
}
