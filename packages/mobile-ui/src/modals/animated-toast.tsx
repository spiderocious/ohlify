import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { duration, spring } from '../theme/motion';
import { AppToast } from './app-toast';
import type { ToastEntry, ToastPosition } from './toast-store';

const OFFSCREEN_TRANSLATE = 24;

/**
 * Wraps a single AppToast with slide+fade entrance/exit. The toast store
 * removes entries from its array immediately on dismiss (no "removing"
 * transitional state), so this component holds the item through its own
 * exit animation before calling onExited to actually unmount — the
 * ToastHost never removes a toast from the DOM until this fires.
 */
export function AnimatedToast({
  entry,
  position,
  onDismiss,
  onExited,
  forceExit = false,
}: {
  entry: ToastEntry;
  position: ToastPosition;
  onDismiss: () => void;
  onExited: () => void;
  /** Set when the store already removed this entry (e.g. its auto-dismiss
   * timer fired) without going through this component's own `dismiss()` —
   * starts the exit animation immediately instead of waiting for a tap. */
  forceExit?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, ...spring.snappy }).start();
  }, [progress]);

  useEffect(() => {
    if (forceExit) setIsExiting(true);
  }, [forceExit]);

  useEffect(() => {
    if (!isExiting) return;
    Animated.timing(progress, { toValue: 0, duration: duration.fast, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onExited();
    });
  }, [isExiting, progress, onExited]);

  function dismiss() {
    setIsExiting(true);
    onDismiss();
  }

  const fromY = position === 'top' ? -OFFSCREEN_TRANSLATE : OFFSCREEN_TRANSLATE;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] });

  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>
      <AppToast entry={entry} onDismiss={dismiss} />
    </Animated.View>
  );
}
