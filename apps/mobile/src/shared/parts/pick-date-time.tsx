import { showCustomModal, showToast } from '@ohlify/mobile-ui';

import { DateTimeForm } from './date-time-form';

/**
 * Cross-platform "pick a future date + time" helper. Mirrors the two-step
 * showDatePicker + showTimePicker flow used throughout mobile/lib (e.g.
 * chat_thread_screen.dart's _pickDateTime, booking_blocks_screen.dart).
 * Resolves null if the user cancels or picks a non-future time.
 */
export async function pickDateTime(params?: { initial?: Date; helpText?: string }): Promise<Date | null> {
  const now = new Date();
  const seed = params?.initial && params.initial > now ? params.initial : new Date(now.getTime() + 60 * 60_000);

  let picked: Date | null = null;
  let dismiss: () => void = () => undefined;

  const handle = showCustomModal(
    params?.helpText ?? 'Pick a date & time',
    (onDismiss) => {
      dismiss = onDismiss;
      return (
        <DateTimeForm
          seed={seed}
          onConfirm={(date) => {
            if (date <= new Date()) {
              showToast('Pick a time in the future.', { type: 'error' });
              return;
            }
            picked = date;
            dismiss();
          }}
        />
      );
    },
    { position: 'center' },
  );
  await handle.onDismissed;
  return picked;
}
