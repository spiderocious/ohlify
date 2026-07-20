import { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppToast } from './app-toast';
import { toastStore } from './toast-store';

/**
 * Renders every active toast as a top/bottom-pinned overlay stack. Mount
 * once near the root (see apps/mobile/src/app.tsx), above navigation, so
 * toasts render over any screen. Mirrors mobile/lib/ui/widgets/toast_overlay/
 * toast_overlay.dart's "wraps app child, stacks active toasts on top" role.
 */
export function ToastHost() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
  const insets = useSafeAreaInsets();

  const topToasts = toasts.filter((t) => t.options.position === 'top');
  const bottomToasts = toasts.filter((t) => t.options.position === 'bottom');

  return (
    <>
      {topToasts.length > 0 ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            gap: 8,
          }}
        >
          {topToasts.map((entry) => (
            <AppToast key={entry.id} entry={entry} onDismiss={() => toastStore.dismiss(entry.id)} />
          ))}
        </View>
      ) : null}

      {bottomToasts.length > 0 ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: insets.bottom + 8,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            gap: 8,
          }}
        >
          {bottomToasts.map((entry) => (
            <AppToast key={entry.id} entry={entry} onDismiss={() => toastStore.dismiss(entry.id)} />
          ))}
        </View>
      ) : null}
    </>
  );
}
