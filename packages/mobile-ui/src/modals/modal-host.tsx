import { useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable } from 'react-native';

import { AppConfirmationModal } from './app-confirmation-modal';
import { AppCustomModal } from './app-custom-modal';
import { AppFeedbackModal } from './app-feedback-modal';
import { AppInputModal } from './app-input-modal';
import { modalStore } from './modal-store';

/**
 * Renders the topmost modal in the stack with a scrim overlay. Mount once
 * near the root (see apps/mobile/src/app.tsx). Mirrors mobile/lib/ui/widgets/
 * modal_overlay/modal_overlay.dart's "wraps app child, renders active modal +
 * scrim on top" role — RN's <Modal> handles the native overlay/backdrop
 * layer Flutter gets from its own overlay routing.
 *
 * All four modal types (feedback/confirmation/input/custom) render.
 */
export function ModalHost() {
  const stack = useSyncExternalStore(modalStore.subscribe, modalStore.getSnapshot);
  const current = stack[stack.length - 1];

  if (!current) return null;

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

  return (
    <Modal transparent={!isFullscreen} animationType="fade" visible onRequestClose={dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {isFullscreen ? (
          content
        ) : (
          <Pressable
            onPress={dismiss}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
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
            <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%' }}>
              {content}
            </Pressable>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
