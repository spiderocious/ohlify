import { Show } from 'meemaw';
import { useState } from 'react';

import { AppButton, AppDateInput, AppText, AppTextInput, AppTimeInput } from '@ohlify/ui';

interface SchedulePickerProps {
  /** Prefilled when rescheduling an existing card. */
  initialAt?: string | null;
  submitLabel?: string;
  onConfirm: (isoUtc: string, note?: string) => void;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Combine a calendar date + an "HH:mm" string into a local Date. */
function combine(date: Date, time: string): Date | null {
  const [h, m] = time.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const out = new Date(date);
  out.setHours(hours, minutes, 0, 0);
  return out;
}

/**
 * Real date + time picker for proposing / rescheduling a call in chat.
 * Uses the shared calendar (AppDateInput) and time (AppTimeInput) primitives —
 * no free-text datetime entry.
 */
export function SchedulePicker({
  initialAt,
  submitLabel = 'Propose',
  onConfirm,
}: SchedulePickerProps) {
  const initial = initialAt ? new Date(initialAt) : null;
  const hasInitial = initial !== null && !Number.isNaN(initial.getTime());

  const [date, setDate] = useState<Date | undefined>(hasInitial ? initial : undefined);
  const [time, setTime] = useState<string>(
    hasInitial
      ? `${String(initial.getHours()).padStart(2, '0')}:${String(initial.getMinutes()).padStart(2, '0')}`
      : '',
  );
  const [note, setNote] = useState('');

  const combined = date && time ? combine(date, time) : null;
  const isPast = combined !== null && combined.getTime() <= Date.now();
  const isValid = combined !== null && !isPast;

  return (
    <div className="flex flex-col gap-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        Pick a date and time for the call. Both of you can accept, decline, or reschedule it
        afterwards.
      </AppText>

      <AppDateInput
        label="Date"
        value={date}
        minDate={startOfToday()}
        placeholder="Select a date"
        bordered
        onChange={setDate}
      />

      <AppTimeInput label="Time" value={time} bordered onChange={setTime} />

      <AppTextInput
        label="Note (optional)"
        value={note}
        placeholder="What's this call about?"
        onChange={setNote}
      />

      <Show when={isPast}>
        <AppText variant="bodySmall" align="start" color="var(--ohl-error)">
          Pick a time in the future.
        </AppText>
      </Show>

      <AppButton
        label={submitLabel}
        expanded
        radius={100}
        isDisabled={!isValid}
        onPressed={
          !isValid ? undefined : () => onConfirm(combined.toISOString(), note.trim() || undefined)
        }
      />
    </div>
  );
}
