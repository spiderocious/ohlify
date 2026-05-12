/**
 * Minute-of-day ↔ HH:MM helpers for the booking-blocks UI.
 *
 * Backend stores blocks as integer minute-of-day (0..1440) so it can do
 * pure-integer comparisons against the daily window. The HTML `<input
 * type="time">` element speaks `HH:MM`, so this module is the bridge.
 */

export interface BookingBlockDraft {
  start_minute: number;
  end_minute: number;
}

const TWO_DIGIT = (n: number): string => n.toString().padStart(2, '0');

export const minutesToHhmm = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(1440, Math.trunc(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  // 24:00 isn't a valid HH:MM, render the special case as 23:59 just for
  // the picker. Server-side an end_minute of 1440 is legitimate (block
  // until midnight); we round-trip via `hhmmToMinutes` which never
  // produces 1440, so the user has to recreate the block to keep it.
  if (h === 24) return '23:59';
  return `${TWO_DIGIT(h)}:${TWO_DIGIT(m)}`;
};

export const hhmmToMinutes = (value: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
};

/**
 * 12-hour display for the list rows. "13:00" → "1:00 PM".
 */
export const formatRange = (startMinute: number, endMinute: number): string => {
  return `${formatTimeOfDay(startMinute)} – ${formatTimeOfDay(endMinute)}`;
};

const formatTimeOfDay = (minute: number): string => {
  if (minute === 1440) return '12:00 AM';
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${TWO_DIGIT(m)} ${period}`;
};
