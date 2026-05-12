import { useState } from 'react';

import { AppButton, AppText, AppTimeInput } from '@ohlify/ui';

import {
  hhmmToMinutes,
  minutesToHhmm,
  type BookingBlockDraft,
} from '../../lib/booking-blocks-format.js';

interface BookingBlockModalProps {
  initial: BookingBlockDraft | null;
  onSubmit: (draft: BookingBlockDraft) => void;
}

/**
 * Modal body for "Add block" / "Edit block". Two `AppTimeInput`s tied
 * to local HH:MM strings — the parent screen handles minute conversion
 * + dispatches the save mutation.
 *
 * Validates that end > start in-form so the Save button stays disabled
 * until the user has a valid range. The server re-validates regardless.
 */
export function BookingBlockModal({ initial, onSubmit }: BookingBlockModalProps) {
  const [start, setStart] = useState<string>(
    initial ? minutesToHhmm(initial.start_minute) : '13:00',
  );
  const [end, setEnd] = useState<string>(
    initial ? minutesToHhmm(initial.end_minute) : '14:00',
  );
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    const startMin = hhmmToMinutes(start);
    const endMin = hhmmToMinutes(end);
    if (startMin === null || endMin === null) {
      setError('Pick both a start and end time.');
      return;
    }
    if (endMin <= startMin) {
      setError('End time must be after start time.');
      return;
    }
    onSubmit({ start_minute: startMin, end_minute: endMin });
  };

  return (
    <div className="flex flex-col gap-4 px-1 py-2">
      <AppText variant="bodySmall" align="start" className="text-text-muted">
        Pick a window every day you don&apos;t want to be booked. Times are in your local
        timezone.
      </AppText>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <AppTimeInput label="From" value={start} onChange={setStart} />
        </div>
        <div className="flex-1">
          <AppTimeInput label="To" value={end} onChange={setEnd} errorMessage={error} />
        </div>
      </div>

      <AppButton label="Save" variant="solid" expanded radius={100} onPressed={submit} />
    </div>
  );
}
