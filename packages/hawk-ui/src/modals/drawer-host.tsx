import { useEffect, useState } from 'react';

import { HawkButton } from '../actions/button.js';
import { HawkOverlay, HawkOverlaySurface } from '../contracts/overlay.js';
import { HawkTextArea, HawkTextInput } from '../inputs/text-input.js';
import { HawkSemantic } from '../theme/semantic.js';

import {
  HawkDrawer,
  type HawkOverlayEntry,
  type HawkPromptOptions,
} from './drawer-service.js';
import {
  HawkBottomSheet,
  HawkConfirmModal,
  HawkDelayedSendModal,
  HawkFeedbackModal,
  HawkModal,
  HawkSideSheet,
  HawkTakeover,
  HawkTypedConfirmModal,
} from './modal.js';

/**
 * Renders whatever `HawkDrawer` has queued.
 *
 * Mount once inside a Hawk tree — the gallery does, and any app adopting Hawk
 * would. It is deliberately separate from `@ohlify/ui`'s `ModalHost`: both can
 * be mounted in the same document without interfering, which is what lets the
 * Hawk preview live inside the running admin app.
 *
 * Entries render stacked in queue order. The overlay contract's escape stack
 * means Escape closes the topmost one only, so a confirm raised from inside a
 * sheet dismisses back to the sheet rather than collapsing both.
 */
export function HawkDrawerHost({ container }: { container?: HTMLElement | null }) {
  const [entries, setEntries] = useState<readonly HawkOverlayEntry[]>(() =>
    HawkDrawer.snapshot(),
  );

  useEffect(() => HawkDrawer.subscribe(setEntries), []);

  return (
    <>
      {entries.map((entry) => (
        <DrawerLayer key={entry.id} entry={entry} container={container} />
      ))}
    </>
  );
}

function DrawerLayer({
  entry,
  container,
}: {
  entry: HawkOverlayEntry;
  container?: HTMLElement | null;
}) {
  const close = (value: boolean | string | null) => HawkDrawer.resolveEntry(entry.id, value);

  switch (entry.kind) {
    case 'feedback':
      return (
        <HawkFeedbackModal
          open
          onClose={() => close(true)}
          title={entry.options.title}
          message={entry.options.message}
          semantic={entry.options.semantic ?? HawkSemantic.SUCCESS}
          actionLabel={entry.options.actionLabel ?? 'Done'}
        />
      );

    case 'confirm':
      return (
        <HawkConfirmModal
          open
          // Dismissing is a "no". A confirm that resolves true on a scrim click
          // would turn a stray tap into an executed action.
          onClose={() => close(false)}
          onConfirm={() => close(true)}
          title={entry.options.title}
          message={entry.options.message}
          confirmLabel={entry.options.confirmLabel}
          cancelLabel={entry.options.cancelLabel}
          destructive={entry.options.destructive ?? false}
        />
      );

    case 'typed-confirm':
      return (
        <HawkTypedConfirmModal
          open
          onClose={() => close(false)}
          onConfirm={() => close(true)}
          title={entry.options.title}
          message={entry.options.message}
          phrase={entry.options.phrase}
          confirmLabel={entry.options.confirmLabel}
          summary={entry.options.summary}
        />
      );

    case 'delayed-send':
      return (
        <HawkDelayedSendModal
          open
          onClose={() => close(false)}
          onSend={() => close(true)}
          onCancel={() => close(false)}
          title={entry.options.title}
          message={entry.options.message}
          delaySeconds={entry.options.delaySeconds}
          summary={entry.options.summary}
        />
      );

    case 'prompt':
      return <PromptLayer options={entry.options} onSettle={close} />;

    case 'custom': {
      const surface = entry.options.surface ?? 'bottom-sheet';
      const dismiss = () => close(false);
      const body = entry.render(dismiss);

      if (surface === 'bottom-sheet') {
        return (
          <HawkBottomSheet open onClose={dismiss} title={entry.options.title}>
            {body}
          </HawkBottomSheet>
        );
      }
      if (surface === 'side-sheet') {
        return (
          <HawkSideSheet open onClose={dismiss} title={entry.options.title}>
            {body}
          </HawkSideSheet>
        );
      }
      if (surface === 'takeover') {
        return (
          <HawkTakeover open onClose={dismiss} title={entry.options.title}>
            {body}
          </HawkTakeover>
        );
      }
      return (
        <HawkOverlay
          open
          onClose={dismiss}
          surface={HawkOverlaySurface.MODAL}
          dismissible={entry.options.dismissible ?? true}
          container={container}
          label={entry.options.title}
        >
          {entry.options.title ? (
            <HawkModal open onClose={dismiss} title={entry.options.title}>
              {body}
            </HawkModal>
          ) : (
            <div className="p-hawk-pad">{body}</div>
          )}
        </HawkOverlay>
      );
    }
  }
}

/**
 * The prompt body.
 *
 * Split into its own component because it holds state, and a hook cannot live
 * inside the switch above.
 */
function PromptLayer({
  options,
  onSettle,
}: {
  options: HawkPromptOptions;
  onSettle: (value: string | null) => void;
}) {
  const [value, setValue] = useState(options.defaultValue ?? '');
  const [touched, setTouched] = useState(false);

  const error = options.validate?.(value);
  // Validation shows only once the user has engaged. Opening a dialog that is
  // already displaying an error the user has not yet had a chance to cause is
  // a scolding, not a hint.
  const showError = touched && Boolean(error);

  const submit = () => {
    setTouched(true);
    if (error) return;
    onSettle(value);
  };

  return (
    <HawkModal
      open
      onClose={() => onSettle(null)}
      title={options.title}
      description={options.message}
      footer={
        <>
          <HawkButton
            label={options.cancelLabel ?? 'Cancel'}
            variant="ghost"
            onClick={() => onSettle(null)}
          />
          <HawkButton
            label={options.confirmLabel ?? 'Save'}
            disabled={Boolean(error) && touched}
            onClick={submit}
          />
        </>
      }
    >
      <div className="pb-hawk-2">
        {options.multiline ? (
          <HawkTextArea
            label={options.label}
            value={value}
            onChange={(next) => {
              setTouched(true);
              setValue(next);
            }}
            placeholder={options.placeholder}
            state={showError ? { error: true, errorText: error } : {}}
          />
        ) : (
          <HawkTextInput
            label={options.label}
            value={value}
            onChange={(next) => {
              setTouched(true);
              setValue(next);
            }}
            placeholder={options.placeholder}
            state={showError ? { error: true, errorText: error } : {}}
          />
        )}
      </div>
    </HawkModal>
  );
}
