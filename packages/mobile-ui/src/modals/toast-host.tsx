import { useEffect, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedToast } from './animated-toast';
import { toastStore, type ToastEntry } from './toast-store';

/**
 * Renders every active toast as a top/bottom-pinned overlay stack. Mount
 * once near the root (see apps/mobile/src/app.tsx), above navigation, so
 * toasts render over any screen. Mirrors mobile/lib/ui/widgets/toast_overlay/
 * toast_overlay.dart's "wraps app child, stacks active toasts on top" role.
 *
 * The store removes entries from its array the instant they're dismissed —
 * to let each toast play a slide/fade exit before it actually leaves the
 * tree, this component keeps its own local list ("displayed") that only
 * drops an entry once AnimatedToast reports its exit animation finished.
 */
export function ToastHost() {
  const storeToasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
  const [displayed, setDisplayed] = useState<ToastEntry[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Add any store entries not yet displayed, in store order — never drop
    // an entry here even if the store already removed it; only onExited does.
    setDisplayed((prev) => {
      const prevIds = new Set(prev.map((t) => t.id));
      const additions = storeToasts.filter((t) => !prevIds.has(t.id));
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
  }, [storeToasts]);

  function onExited(id: string) {
    setDisplayed((prev) => prev.filter((t) => t.id !== id));
  }

  const storeIds = new Set(storeToasts.map((t) => t.id));
  const topToasts = displayed.filter((t) => t.options.position === 'top');
  const bottomToasts = displayed.filter((t) => t.options.position === 'bottom');

  function renderToast(entry: ToastEntry) {
    // Still present in the store == not dismissed yet == render normally.
    // Absent from the store == dismissed == AnimatedToast is mid-exit.
    const stillInStore = storeIds.has(entry.id);
    return (
      <AnimatedToast
        key={entry.id}
        entry={entry}
        position={entry.options.position}
        onDismiss={() => toastStore.dismiss(entry.id)}
        onExited={() => onExited(entry.id)}
        // AnimatedToast drives its own exit purely from onDismiss being
        // called; when the store already dropped it (auto-dismiss timer),
        // trigger the same exit path immediately on mount-detection.
        {...(!stillInStore ? { forceExit: true } : null)}
      />
    );
  }

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
          {topToasts.map(renderToast)}
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
          {bottomToasts.map(renderToast)}
        </View>
      ) : null}
    </>
  );
}
