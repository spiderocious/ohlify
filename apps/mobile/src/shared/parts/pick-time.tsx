import { showCustomModal } from '@ohlify/mobile-ui';

import { TimeForm } from './time-form';

/** Cross-platform "pick a minute-of-day" helper (0-1439). Mirrors showTimePicker() usage in mobile/lib/features/profile/screen/booking_blocks_screen.dart. */
export async function pickTime(params: { seedMinute: number; helpText?: string }): Promise<number | null> {
  let picked: number | null = null;
  let dismiss: () => void = () => undefined;

  const handle = showCustomModal(
    'Pick a time',
    (onDismiss) => {
      dismiss = onDismiss;
      return (
        <TimeForm
          seedMinute={params.seedMinute}
          helpText={params.helpText}
          onConfirm={(minute) => {
            picked = minute;
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
