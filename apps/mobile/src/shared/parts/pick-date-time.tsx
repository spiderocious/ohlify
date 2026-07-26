import { AppDateTimePicker, showCustomModal, showToast } from '@ohlify/mobile-ui';

/**
 * Cross-platform "pick a future date + time" helper. Opens the custom
 * AppDateTimePicker (a calendar grid + time wheels, identical on native and
 * web) in a modal. Resolves null if the user cancels or picks a non-future
 * time. Mirrors mobile/lib/shared/helpers/pick_date_time.dart.
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
        <AppDateTimePicker
          seed={seed}
          minimumDate={new Date()}
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
