import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable } from 'react-native';

import { duration, spring } from '../theme/motion';
import { AppConfirmationModal } from './app-confirmation-modal';
import { AppCustomModal } from './app-custom-modal';
import { AppFeedbackModal } from './app-feedback-modal';
import { AppInputModal } from './app-input-modal';
import { modalStore, type ModalEntry } from './modal-store';

/**
 * Renders the topmost modal in the stack with an animated scrim + content
 * reveal. Mount once near the root (see apps/mobile/src/app.tsx). Mirrors
 * mobile/lib/ui/widgets/modal_overlay/modal_overlay.dart's "wraps app
 * child, renders active modal + scrim on top" role — RN's <Modal> handles
 * the native overlay/backdrop layer Flutter gets from its own overlay
 * routing.
 *
 * The store removes an entry from its stack the instant it's dismissed
 * (see modal-store.ts's dismiss()) — so `onDismissed` resolves immediately,
 * which is correct (callers awaiting it shouldn't wait on a visual
 * animation). This component separately holds the outgoing entry in local
 * state through its own exit animation before the native <Modal> actually
 * unmounts, same technique as toast-host.tsx.
 *
 * All four modal types (feedback/confirmation/input/custom) render.
 */
export function ModalHost() {
  const stack = useSyncExternalStore(modalStore.subscribe, modalStore.getSnapshot);
  const storeTop = stack[stack.length - 1];

  const [displayed, setDisplayed] = useState<ModalEntry | undefined>(undefined);
  const [isExiting, setIsExiting] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (storeTop && storeTop.id !== displayed?.id) {
      // A new modal became the top of the stack — show it immediately,
      // even if one was mid-exit (the new one just replaces it in place).
      setDisplayed(storeTop);
      setIsExiting(false);
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, ...spring.snappy }).start();
    } else if (!storeTop && displayed && !isExiting) {
      setIsExiting(true);
      Animated.timing(progress, { toValue: 0, duration: duration.base, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setDisplayed(undefined);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeTop]);

  if (!displayed) return null;

  const current = displayed;
  const isFullscreen = current.options.position === 'fullscreen';
  const dismiss = () => {
    if (current.options.dismissible) modalStore.dismiss(current.id);
  };
  const onDismiss = () => modalStore.dismiss(current.id);

  let content;
  switch (current.type) {
    case 'feedback':
      content = <AppFeedbackModal entry={current} onDismiss={onDismiss} />;
      break;
    case 'confirmation':
      content = <AppConfirmationModal entry={current} onDismiss={onDismiss} />;
      break;
    case 'input':
      content = <AppInputModal entry={current} onDismiss={onDismiss} />;
      break;
    case 'custom':
      content = <AppCustomModal entry={current} onDismiss={onDismiss} />;
      break;
  }

  const scrimOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });
  const contentOpacity = progress;
  const contentScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  return (
    <Modal transparent={!isFullscreen} animationType="none" visible onRequestClose={dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {isFullscreen ? (
          <Animated.View style={{ flex: 1, opacity: contentOpacity }}>{content}</Animated.View>
        ) : (
          <Pressable
            onPress={dismiss}
            style={{ flex: 1 }}
          >
            <Animated.View
              pointerEvents="none"
              style={{ ...ABSOLUTE_FILL, backgroundColor: '#000000', opacity: scrimOpacity }}
            />
            <Animated.View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent:
                  current.options.position === 'top'
                    ? 'flex-start'
                    : current.options.position === 'bottom'
                      ? 'flex-end'
                      : 'center',
                paddingVertical: 24,
              }}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{ width: '100%' }}
              >
                <Animated.View style={{ opacity: contentOpacity, transform: [{ scale: contentScale }] }}>
                  {content}
                </Animated.View>
              </Pressable>
            </Animated.View>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ABSOLUTE_FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
