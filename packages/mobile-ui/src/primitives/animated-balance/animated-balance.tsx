import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { AppText, type AppTextProps } from '../app-text/app-text';

/**
 * Counts up (or down) from the previously-rendered value to `value` whenever
 * it changes, rather than snapping the text instantly. 1:1 with
 * mobile/lib/ui/widgets/app_animated_balance/app_animated_balance.dart.
 *
 * `value` is the raw numeric amount (e.g. kobo or naira) — `format` turns
 * each intermediate frame into display text, so callers keep full control
 * over currency symbol/grouping/decimals (see wallet-screen.tsx's
 * formatKobo) while this component only owns the interpolation.
 */
export interface AnimatedBalanceProps extends Omit<AppTextProps, 'children'> {
  value: number;
  format: (value: number) => string;
  durationMs?: number;
}

export function AnimatedBalance({ value, format, durationMs = 600, ...textProps }: AnimatedBalanceProps) {
  const anim = useRef(new Animated.Value(value)).current;
  const previousValue = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (previousValue.current === value) return;
    anim.setValue(previousValue.current);
    const listenerId = anim.addListener(({ value: v }) => setDisplayValue(v));
    Animated.timing(anim, { toValue: value, duration: durationMs, useNativeDriver: false }).start(() => {
      anim.removeListener(listenerId);
      setDisplayValue(value);
    });
    previousValue.current = value;
    return () => anim.removeListener(listenerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return <AppText {...textProps}>{format(Math.round(displayValue))}</AppText>;
}
